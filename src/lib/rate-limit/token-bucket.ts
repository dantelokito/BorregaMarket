type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export class RateLimitError extends Error {
  constructor(message = "Demasiadas solicitudes. Intenta más tarde.") {
    super(message);
    this.name = "RateLimitError";
  }
}

/** In-memory token bucket. Returns true if the request is allowed. */
export function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (existing.count >= limit) return false;
  existing.count += 1;
  return true;
}

export function assertRateLimit(key: string, limit: number, windowMs: number): void {
  if (!consumeRateLimit(key, limit, windowMs)) {
    throw new RateLimitError();
  }
}
