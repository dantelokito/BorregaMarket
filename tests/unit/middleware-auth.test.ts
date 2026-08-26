import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const VALID_SECRET = "unit-test-jwt-secret-min-32-chars!!";

function request(path: string, token?: string) {
  const headers = new Headers();
  if (token) headers.set("cookie", `lbm_token=${token}`);
  return new NextRequest(new URL(path, "http://localhost:8080"), { headers });
}

describe("middleware JWT verification", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("redirects forged tokens on /admin to login", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("JWT_SECRET", VALID_SECRET);
    vi.resetModules();
    const { middleware } = await import("../../src/middleware");
    const forged = jwt.sign(
      {
        sub: "attacker",
        email: "evil@test.com",
        role: "ADMIN",
        name: "Evil",
      },
      "wrong-secret-that-is-at-least-32-chars"
    );
    const res = await middleware(request("/admin", forged));
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("allows a valid ADMIN token on /admin", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("JWT_SECRET", VALID_SECRET);
    vi.resetModules();
    const { signToken } = await import("@/lib/auth/token");
    const { middleware } = await import("../../src/middleware");
    const token = signToken({
      sub: "admin-1",
      email: "admin@test.com",
      role: "ADMIN",
      name: "Admin",
    });
    const res = await middleware(request("/admin", token));
    expect(res.headers.get("location")).toBeNull();
  });

  it("redirects a valid CLIENT token away from /admin", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("JWT_SECRET", VALID_SECRET);
    vi.resetModules();
    const { signToken } = await import("@/lib/auth/token");
    const { middleware } = await import("../../src/middleware");
    const token = signToken({
      sub: "client-1",
      email: "cliente@test.com",
      role: "CLIENT",
      name: "Maria",
    });
    const res = await middleware(request("/admin", token));
    expect(res.headers.get("location")).toMatch(/\/$/);
  });
});
