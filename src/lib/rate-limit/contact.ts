type Bucket = { count: number; resetAt: number };

const providerBuckets = new Map<string, Bucket>();
const ipBuckets = new Map<string, Bucket>();

function getLimit(envKey: string, fallback: number): number {
  const raw = process.env[envKey];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function peek(store: Map<string, Bucket>, key: string, limit: number, windowMs: number): boolean {
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

/**
 * Rate limit contacto: 5/10min por providerId+IP(+session), 20/h por IP.
 * Store in-memory (MVP, ADR-008).
 */
export function checkContactRateLimit(params: {
  providerId: string;
  ip: string;
  sessionId?: string | null;
}): boolean {
  const perProvider = getLimit("CONTACT_RATE_LIMIT_PER_PROVIDER", 5);
  const perIp = getLimit("CONTACT_RATE_LIMIT_PER_IP", 20);
  const providerWindow = 10 * 60 * 1000;
  const ipWindow = 60 * 60 * 1000;

  const providerKey = [
    params.providerId,
    params.ip || "unknown",
    params.sessionId ?? "",
  ].join(":");
  const ipKey = params.ip || "unknown";

  if (
    !peek(providerBuckets, providerKey, perProvider, providerWindow) ||
    !peek(ipBuckets, ipKey, perIp, ipWindow)
  ) {
    return false;
  }

  increment(providerBuckets, providerKey, providerWindow);
  increment(ipBuckets, ipKey, ipWindow);
  return true;
}
