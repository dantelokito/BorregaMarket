import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("checkAuthRateLimit memory store", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.resetModules();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    process.env.AUTH_RATE_LIMIT_LOGIN_PER_IP = "2";
    process.env.AUTH_RATE_LIMIT_REGISTER_PER_IP = "1";
    process.env.NODE_ENV = originalNodeEnv;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("allows then blocks after the login window fills", async () => {
    const { checkAuthRateLimit } = await import("@/lib/rate-limit/auth");
    const params = { action: "login" as const, ip: "2.2.2.2" };
    expect(await checkAuthRateLimit(params)).toBe(true);
    expect(await checkAuthRateLimit(params)).toBe(true);
    expect(await checkAuthRateLimit(params)).toBe(false);
  });

  it("throws AuthRedisUnavailableError in production without Upstash keys", async () => {
    process.env.NODE_ENV = "production";
    const { checkAuthRateLimit, AuthRedisUnavailableError } = await import(
      "@/lib/rate-limit/auth"
    );
    await expect(
      checkAuthRateLimit({ action: "register", ip: "3.3.3.3" })
    ).rejects.toBeInstanceOf(AuthRedisUnavailableError);
  });
});
