import { createHash } from "crypto";
import { Redis } from "@upstash/redis";

/**
 * ADR-043: cache-aside fail-open en Upstash para GET públicos de proveedores.
 * Sin UPSTASH_* o con PUBLIC_CACHE_DISABLED=1 → BYPASS (sin fallback en memoria).
 * Cualquier error o timeout de Redis → se lee la BD; la caché nunca produce 5xx.
 */

export type CacheStatus = "HIT" | "MISS" | "BYPASS";

export const CACHE_TIMEOUT_MS = 300;
export const DETAIL_TTL_SECONDS = 60;
export const LIST_TTL_SECONDS = 30;

const PREFIX = "lbm:c1";
export const LIST_GEN_KEY = `${PREFIX}:pl:gen`;

export function detailKey(providerId: string): string {
  return `${PREFIX}:pd:${providerId}`;
}

export function listKey(gen: number, normalizedQuery: string): string {
  const hash = createHash("sha1").update(normalizedQuery).digest("hex");
  return `${PREFIX}:pl:${gen}:${hash}`;
}

let cachedClient: { signature: string; redis: Redis } | null = null;
let warned = false;

function warnOnce(event: string, err: unknown) {
  if (warned) return;
  warned = true;
  console.warn(`[cache] ${event}`, err instanceof Error ? err.message : err);
}

function getCacheRedis(): Redis | null {
  if (process.env.PUBLIC_CACHE_DISABLED === "1") return null;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const signature = `${url}|${token}`;
  if (cachedClient?.signature !== signature) {
    cachedClient = {
      signature,
      redis: new Redis({ url, token, retry: false, automaticDeserialization: false }),
    };
  }
  return cachedClient.redis;
}

export function isPublicCacheEnabled(): boolean {
  return getCacheRedis() !== null;
}

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("redis_timeout")), CACHE_TIMEOUT_MS);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

async function readThrough<T>(
  redis: Redis,
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>
): Promise<{ body: T; status: CacheStatus }> {
  let raw: string | null;
  try {
    raw = await withTimeout(redis.get<string>(key));
  } catch (err) {
    warnOnce("read_failed", err);
    return { body: await loader(), status: "BYPASS" };
  }

  if (typeof raw === "string") {
    try {
      return { body: JSON.parse(raw) as T, status: "HIT" };
    } catch {
      // Valor corrupto: se recalcula y se sobrescribe.
    }
  }

  const body = await loader();
  try {
    await withTimeout(redis.set(key, JSON.stringify(body), { ex: ttlSeconds }));
  } catch (err) {
    warnOnce("write_failed", err);
  }
  return { body, status: "MISS" };
}

/** Solo se cachea lo que `loader` resuelve; si lanza (404, 500) no se escribe nada. */
export async function cachedProviderDetail<T>(
  providerId: string,
  loader: () => Promise<T>
): Promise<{ body: T; status: CacheStatus }> {
  const redis = getCacheRedis();
  if (!redis) return { body: await loader(), status: "BYPASS" };
  return readThrough(redis, detailKey(providerId), DETAIL_TTL_SECONDS, loader);
}

export async function cachedProviderList<T>(
  normalizedQuery: string,
  loader: () => Promise<T>
): Promise<{ body: T; status: CacheStatus }> {
  const redis = getCacheRedis();
  if (!redis) return { body: await loader(), status: "BYPASS" };

  let gen: number;
  try {
    const raw = await withTimeout(redis.get<string>(LIST_GEN_KEY));
    const parsed = Number(raw ?? 0);
    gen = Number.isFinite(parsed) ? parsed : 0;
  } catch (err) {
    warnOnce("read_failed", err);
    return { body: await loader(), status: "BYPASS" };
  }
  return readThrough(redis, listKey(gen, normalizedQuery), LIST_TTL_SECONDS, loader);
}

/**
 * Llamar después del commit en toda mutación que cambie la representación pública.
 * Nunca lanza: si Redis falla se registra y la escritura del negocio sigue.
 */
export async function invalidateProviderCache(providerIds: Iterable<string>): Promise<void> {
  const redis = getCacheRedis();
  if (!redis) return;
  const ids = [...new Set([...providerIds].filter(Boolean))];
  try {
    await withTimeout(
      Promise.all([
        ...(ids.length > 0 ? [redis.del(...ids.map(detailKey))] : []),
        redis.incr(LIST_GEN_KEY),
      ])
    );
  } catch (err) {
    console.warn("[cache] invalidate_failed", err instanceof Error ? err.message : err);
  }
}

/** Query normalizada de `GET /api/providers` (solo parámetros conocidos, ordenados). */
export function normalizeProviderListQuery(params: {
  page: number;
  limit: number;
  q?: string | null;
  city?: string | null;
  category?: string | null;
  verified?: boolean;
  offersWholesale?: boolean;
  offersDelivery?: boolean;
  geo?: { lat: number; lng: number; radiusKm: number } | null;
}): string {
  const entries: [string, string][] = [
    ["page", String(params.page)],
    ["limit", String(params.limit)],
  ];
  const q = params.q?.trim().toLowerCase();
  if (q) entries.push(["q", q]);
  if (params.city) entries.push(["city", params.city.toLowerCase()]);
  if (params.category) entries.push(["category", params.category]);
  if (params.verified) entries.push(["verified", "true"]);
  if (params.offersWholesale) entries.push(["offersWholesale", "true"]);
  if (params.offersDelivery) entries.push(["offersDelivery", "true"]);
  if (params.geo) {
    entries.push(["lat", params.geo.lat.toFixed(3)]);
    entries.push(["lng", params.geo.lng.toFixed(3)]);
    entries.push(["radiusKm", String(params.geo.radiusKm)]);
  }
  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return new URLSearchParams(entries).toString();
}

/** CO-F15-002: centro redondeado a 3 decimales antes de filtrar y calcular distancias. */
export function roundCoord(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function __resetPublicCacheForTests() {
  cachedClient = null;
  warned = false;
}
