import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const VALID_SECRET = "unit-test-jwt-secret-min-32-chars!!";

const adminPayload = {
  sub: "admin-1",
  email: "admin@test.com",
  role: "ADMIN" as const,
  name: "Admin",
};

function requestWithToken(token: string, via: "cookie" | "bearer" = "cookie") {
  const headers = new Headers();
  if (via === "cookie") {
    headers.set("cookie", `lbm_token=${token}`);
  } else {
    headers.set("authorization", `Bearer ${token}`);
  }
  return new NextRequest("http://localhost:8080/api/admin/audit", { headers });
}

describe("getSession signature verification", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("returns the payload for a valid cookie token", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("JWT_SECRET", VALID_SECRET);
    vi.resetModules();
    const { signToken } = await import("@/lib/auth/token");
    const { getSession } = await import("@/lib/auth/session");
    const token = signToken(adminPayload);
    expect(getSession(requestWithToken(token))).toEqual(adminPayload);
  });

  it("returns the payload for a valid Bearer token", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("JWT_SECRET", VALID_SECRET);
    vi.resetModules();
    const { signToken } = await import("@/lib/auth/token");
    const { getSession } = await import("@/lib/auth/session");
    const token = signToken(adminPayload);
    expect(getSession(requestWithToken(token, "bearer"))).toEqual(adminPayload);
  });

  it("returns null for an unsigned forged admin token", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("JWT_SECRET", VALID_SECRET);
    vi.resetModules();
    const { getSession } = await import("@/lib/auth/session");
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString(
      "base64url"
    );
    const body = Buffer.from(
      JSON.stringify({
        ...adminPayload,
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
    ).toString("base64url");
    expect(getSession(requestWithToken(`${header}.${body}.`))).toBeNull();
  });
});
