import { Redis } from "@upstash/redis";

type Bucket = { count: number; resetAt: number };

const ipBuckets = new Map<string, Bucket>();
let loggedRedisDisabled = false;

export type AuthRateAction = "login" | "register";

export class AuthRateLimitError extends Error {
  constructor(message = "Demasiados intentos. Intenta más tarde.") {
    super(message);
    this.name = "AuthRateLimitError";
  }
}

export class AuthRedisUnavailableError extends Error {
  constructor(message = "Servicio no disponible. Intenta más tarde.") {
    super(message);
    this.name = "AuthRedisUnavailableError";
  }
}

function getLimit(envKey: string, fallback: number): number {
  const raw = process.env[envKey];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function peek(store: Map<string, Bucket>, key: string, limit: number): boolean {
  const now = Date.now();
  const existing = store.get(key);
  if (!existing || existing.resetAt <= now) {
    return true;
  }
  return existing.count < limit;
}

function increment(store: Map<string, Bucket>, key: string, windowMs: number): void {
  const now = Date.now();
  const existing = store.get(key);
  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  existing.count += 1;
}

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

async function redisAllowed(
  redis: Redis,
  key: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  const current = await redis.get<number | string | null>(key);
  const count = Number(current ?? 0);
  if (Number.isFinite(count) && count >= limit) {
    return false;
  }
  const next = await redis.incr(key);
  if (next === 1) {
    await redis.pexpire(key, windowMs);
  }
  return true;
}

function memoryAllowed(key: string, limit: number, windowMs: number): boolean {
  if (!peek(ipBuckets, key, limit)) {
    return false;
  }
  increment(ipBuckets, key, windowMs);
  return true;
}

function limitsFor(action: AuthRateAction): { limit: number; windowMs: number } {
  if (action === "login") {
    return {
      limit: getLimit("AUTH_RATE_LIMIT_LOGIN_PER_IP", 10),
      windowMs: 15 * 60 * 1000,
    };
  }
  return {
    limit: getLimit("AUTH_RATE_LIMIT_REGISTER_PER_IP", 5),
    windowMs: 60 * 60 * 1000,
  };
}

export function clientIp(request: { headers: Headers }): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

/**
 * Rate limit auth: 10/15min login por IP, 5/h registro por IP.
 * Store Upstash Redis. Local sin env: in-memory. Staging/prod: fail closed 503.
 */
export async function checkAuthRateLimit(params: {
  action: AuthRateAction;
  ip: string;
}): Promise<boolean> {
  const { limit, windowMs } = limitsFor(params.action);
  const ip = params.ip || "unknown";
  const redis = getRedis();
  const allowMemory =
    process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
  const key = `rl:auth:${params.action}:${ip}`;

  if (!redis) {
    if (!allowMemory) {
      throw new AuthRedisUnavailableError();
    }
    if (!loggedRedisDisabled) {
      loggedRedisDisabled = true;
      console.warn("[rate-limit] redis_disabled — using in-memory store for auth");
    }
    return memoryAllowed(key, limit, windowMs);
  }

  try {
    return await redisAllowed(redis, key, limit, windowMs);
  } catch (err) {
    if (err instanceof AuthRedisUnavailableError) throw err;
    if (allowMemory) {
      console.warn("[rate-limit] redis error, falling back to memory", err);
      return memoryAllowed(key, limit, windowMs);
    }
    throw new AuthRedisUnavailableError();
  }
}
