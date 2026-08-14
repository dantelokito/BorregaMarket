import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";

const getSession = vi.fn();
const getAdminAnalytics = vi.fn();

vi.mock("@/lib/auth/session", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/session")>(
    "@/lib/auth/session"
  );
  return {
    ...actual,
    getSession: (...args: unknown[]) => getSession(...args),
  };
});

vi.mock("@/lib/services/admin-analytics.service", () => ({
  getAdminAnalytics: (...args: unknown[]) => getAdminAnalytics(...args),
}));

import { GET } from "@/app/api/admin/analytics/route";

function jsonRequest(url: string) {
  return new NextRequest(new URL(url, "http://localhost:8080"));
}

describe("admin analytics route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without session", async () => {
    getSession.mockReturnValue(null);
    const res = await GET(jsonRequest("/api/admin/analytics"));
    expect(res.status).toBe(401);
  });

  it("returns 403 for PROVIDER", async () => {
    getSession.mockReturnValue({
      sub: "u2",
      role: UserRole.PROVIDER,
      email: "p@test.com",
      name: "Carlos",
    });
    const res = await GET(jsonRequest("/api/admin/analytics"));
    expect(res.status).toBe(403);
  });

  it("returns empty true for ADMIN", async () => {
    getSession.mockReturnValue({
      sub: "admin",
      role: UserRole.ADMIN,
      email: "a@test.com",
      name: "Admin",
    });
    getAdminAnalytics.mockResolvedValue({
      empty: true,
      range: "7d",
      timezone: "America/Monterrey",
      from: "2026-08-08T06:00:00.000Z",
      to: "2026-08-15T06:00:00.000Z",
      kpis: null,
    });
    const res = await GET(jsonRequest("/api/admin/analytics?range=7d"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.empty).toBe(true);
    expect(body.data.kpis).toBeNull();
  });

  it("returns 400 for invalid range", async () => {
    getSession.mockReturnValue({
      sub: "admin",
      role: UserRole.ADMIN,
      email: "a@test.com",
      name: "Admin",
    });
    const res = await GET(jsonRequest("/api/admin/analytics?range=year"));
    expect(res.status).toBe(400);
  });
});
