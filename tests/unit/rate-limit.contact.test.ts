import { beforeEach, describe, expect, it, vi } from "vitest";

describe("checkContactRateLimit memory store", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    process.env.CONTACT_RATE_LIMIT_PER_PROVIDER = "2";
    process.env.CONTACT_RATE_LIMIT_PER_IP = "20";
  });

  it("allows then blocks after the per-provider window fills", async () => {
    const { checkContactRateLimit } = await import("@/lib/rate-limit/contact");
    const params = { providerId: "p1", ip: "1.1.1.1" };
    expect(await checkContactRateLimit(params)).toBe(true);
    expect(await checkContactRateLimit(params)).toBe(true);
    expect(await checkContactRateLimit(params)).toBe(false);
  });
});
