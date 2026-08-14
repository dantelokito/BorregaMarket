import { Redis } from "@upstash/redis";

type Bucket = { count: number; resetAt: number };

const providerBuckets = new Map<string, Bucket>();
const ipBuckets = new Map<string, Bucket>();
let loggedRedisDisabled = false;

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

export class ContactRedisUnavailableError extends Error {
  constructor(message = "Servicio no disponible. Intenta más tarde.") {
    super(message);
    this.name = "ContactRedisUnavailableError";
  }
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

function memoryAllowed(params: {
  providerId: string;
  ip: string;
  sessionId?: string | null;
  perProvider: number;
  perIp: number;
  providerWindow: number;
  ipWindow: number;
}): boolean {
  const providerKey = [
    params.providerId,
    params.ip || "unknown",
    params.sessionId ?? "",
  ].join(":");
  const ipKey = params.ip || "unknown";

  if (
    !peek(providerBuckets, providerKey, params.perProvider) ||
    !peek(ipBuckets, ipKey, params.perIp)
  ) {
    return false;
  }

  increment(providerBuckets, providerKey, params.providerWindow);
  increment(ipBuckets, ipKey, params.ipWindow);
  return true;
}

/**
 * Rate limit contacto: 5/10min por providerId+IP, 20/h por IP.
 * Store Upstash Redis (ADR-015). Local sin env: in-memory + redis_disabled.
 * Staging/prod: fail closed 503.
 */
export async function checkContactRateLimit(params: {
  providerId: string;
  ip: string;
  sessionId?: string | null;
}): Promise<boolean> {
  const perProvider = getLimit("CONTACT_RATE_LIMIT_PER_PROVIDER", 5);
  const perIp = getLimit("CONTACT_RATE_LIMIT_PER_IP", 20);
  const providerWindow = 10 * 60 * 1000;
  const ipWindow = 60 * 60 * 1000;
  const ip = params.ip || "unknown";
  const redis = getRedis();
  const allowMemory =
    process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";

  if (!redis) {
    if (!allowMemory) {
      throw new ContactRedisUnavailableError();
    }
    if (!loggedRedisDisabled) {
      loggedRedisDisabled = true;
      console.warn("[rate-limit] redis_disabled — using in-memory store");
    }
    return memoryAllowed({
      providerId: params.providerId,
      ip,
      sessionId: params.sessionId,
      perProvider,
      perIp,
      providerWindow,
      ipWindow,
    });
  }

  try {
    const providerKey = `rl:contact:p:${params.providerId}:${ip}`;
    const ipKey = `rl:contact:ip:${ip}`;
    const providerOk = await redisAllowed(redis, providerKey, perProvider, providerWindow);
    if (!providerOk) return false;
    return redisAllowed(redis, ipKey, perIp, ipWindow);
  } catch (err) {
    if (err instanceof ContactRedisUnavailableError) throw err;
    if (allowMemory) {
      console.warn("[rate-limit] redis error, falling back to memory", err);
      return memoryAllowed({
        providerId: params.providerId,
        ip,
        sessionId: params.sessionId,
        perProvider,
        perIp,
        providerWindow,
        ipWindow,
      });
    }
    throw new ContactRedisUnavailableError();
  }
}
