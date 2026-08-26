import { afterEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";

const VALID_SECRET = "unit-test-jwt-secret-min-32-chars!!";

const payload = {
  sub: "user-1",
  email: "admin@test.com",
  role: "ADMIN" as const,
  name: "Admin",
};

describe("resolveJwtSecret", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("uses the development fallback when JWT_SECRET is missing outside production", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("JWT_SECRET", "");
    vi.resetModules();
    const { resolveJwtSecret, DEV_JWT_FALLBACK } = await import("@/lib/auth/jwt-secret");
    expect(resolveJwtSecret()).toBe(DEV_JWT_FALLBACK);
  });

  it("fails closed in production without a unique 32+ char secret", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("JWT_SECRET", "short");
    vi.resetModules();
    const { resolveJwtSecret, JwtSecretError } = await import("@/lib/auth/jwt-secret");
    expect(() => resolveJwtSecret()).toThrow(JwtSecretError);
  });

  it("rejects the development fallback in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("JWT_SECRET", "dev-secret-change-in-production");
    vi.resetModules();
    const { resolveJwtSecret, JwtSecretError } = await import("@/lib/auth/jwt-secret");
    expect(() => resolveJwtSecret()).toThrow(JwtSecretError);
  });

  it("accepts a unique 32+ character secret in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("JWT_SECRET", VALID_SECRET);
    vi.resetModules();
    const { resolveJwtSecret } = await import("@/lib/auth/jwt-secret");
    expect(resolveJwtSecret()).toBe(VALID_SECRET);
  });
});

describe("Node JWT verify", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("accepts a token signed with JWT_SECRET", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("JWT_SECRET", VALID_SECRET);
    vi.resetModules();
    const { signToken, verifyToken } = await import("@/lib/auth/token");
    const token = signToken(payload);
    expect(verifyToken(token)).toEqual(payload);
  });

  it("rejects a token signed with a different secret", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("JWT_SECRET", VALID_SECRET);
    vi.resetModules();
    const { verifyToken } = await import("@/lib/auth/token");
    const forged = jwt.sign(payload, "other-secret-that-is-at-least-32-chars");
    expect(() => verifyToken(forged)).toThrow();
  });
});

describe("Edge JWT verify", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("accepts a jsonwebtoken-signed token", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("JWT_SECRET", VALID_SECRET);
    vi.resetModules();
    const { signToken } = await import("@/lib/auth/token");
    const { verifyToken } = await import("@/lib/auth/edge-token");
    const token = signToken(payload);
    await expect(verifyToken(token)).resolves.toEqual(payload);
  });

  it("rejects an unsigned payload (alg none)", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("JWT_SECRET", VALID_SECRET);
    vi.resetModules();
    const { verifyToken } = await import("@/lib/auth/edge-token");
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString(
      "base64url"
    );
    const body = Buffer.from(
      JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 3600 })
    ).toString("base64url");
    await expect(verifyToken(`${header}.${body}.`)).resolves.toBeNull();
  });

  it("rejects a token signed with a different secret", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("JWT_SECRET", VALID_SECRET);
    vi.resetModules();
    const { verifyToken } = await import("@/lib/auth/edge-token");
    const forged = jwt.sign(payload, "other-secret-that-is-at-least-32-chars");
    await expect(verifyToken(forged)).resolves.toBeNull();
  });
});
