import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("checkContactRateLimit memory store", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.resetModules();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    process.env.CONTACT_RATE_LIMIT_PER_PROVIDER = "2";
    process.env.CONTACT_RATE_LIMIT_PER_IP = "20";
    process.env.NODE_ENV = originalNodeEnv;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("resolves the Upstash Redis SDK", async () => {
    const mod = await import("@upstash/redis");
    expect(typeof mod.Redis).toBe("function");
  });

  it("allows then blocks after the per-provider window fills", async () => {
    const { checkContactRateLimit } = await import("@/lib/rate-limit/contact");
    const params = { providerId: "p1", ip: "1.1.1.1" };
    expect(await checkContactRateLimit(params)).toBe(true);
    expect(await checkContactRateLimit(params)).toBe(true);
    expect(await checkContactRateLimit(params)).toBe(false);
  });

  it("throws ContactRedisUnavailableError in production without Upstash keys", async () => {
    process.env.NODE_ENV = "production";
    const { checkContactRateLimit, ContactRedisUnavailableError } = await import(
      "@/lib/rate-limit/contact"
    );
    await expect(
      checkContactRateLimit({ providerId: "p1", ip: "1.1.1.1" })
    ).rejects.toBeInstanceOf(ContactRedisUnavailableError);
  });
});
