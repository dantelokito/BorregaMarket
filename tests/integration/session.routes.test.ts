import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";

const getSession = vi.fn();
const getAuthSessionPayload = vi.fn();

vi.mock("@/lib/auth/session", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/session")>(
    "@/lib/auth/session"
  );
  return {
    ...actual,
    getSession: (...args: unknown[]) => getSession(...args),
  };
});

vi.mock("@/lib/services/session.service", () => ({
  getAuthSessionPayload: (...args: unknown[]) => getAuthSessionPayload(...args),
}));

import { GET } from "@/app/api/auth/session/route";

function jsonRequest(url: string) {
  return new NextRequest(new URL(url, "http://localhost:8080"));
}

describe("GET /api/auth/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 for guests and sets no-store", async () => {
    getSession.mockReturnValue(null);
    getAuthSessionPayload.mockResolvedValue({
      authenticated: false,
      role: null,
      brand: null,
    });
    const res = await GET(jsonRequest("/api/auth/session"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    const body = await res.json();
    expect(body.data.authenticated).toBe(false);
    expect(body.data.brand).toBeNull();
  });

  it("returns 200 with brand for PROVIDER", async () => {
    getSession.mockReturnValue({
      sub: "u2",
      role: UserRole.PROVIDER,
      email: "p@test.com",
      name: "Carlos",
    });
    getAuthSessionPayload.mockResolvedValue({
      authenticated: true,
      role: "PROVIDER",
      brand: {
        primaryColor: "#1B5E20",
        secondaryColor: "#0D47A1",
        source: "provider",
      },
    });
    const res = await GET(jsonRequest("/api/auth/session"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.brand.source).toBe("provider");
  });
});
