import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";

const getSession = vi.fn();
const hasModulePermission = vi.fn();
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

vi.mock("@/lib/auth/permissions", () => ({
  hasModulePermission: (...args: unknown[]) => hasModulePermission(...args),
}));

vi.mock("@/lib/services/admin-analytics.service", () => ({
  getAdminAnalytics: (...args: unknown[]) => getAdminAnalytics(...args),
}));

import { GET } from "@/app/api/admin/analytics/route";

function jsonRequest(url: string) {
  return new NextRequest(new URL(url, "http://localhost:8080"));
}

describe("admin analytics dual RBAC (F10)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hasModulePermission.mockResolvedValue(true);
  });

  it("returns 403 when ADMIN lacks ORDERS/view", async () => {
    getSession.mockReturnValue({
      sub: "admin",
      role: UserRole.ADMIN,
      email: "a@test.com",
      name: "Admin",
    });
    hasModulePermission.mockResolvedValue(false);
    const res = await GET(jsonRequest("/api/admin/analytics"));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Sin permiso para este módulo");
    expect(getAdminAnalytics).not.toHaveBeenCalled();
  });
});
