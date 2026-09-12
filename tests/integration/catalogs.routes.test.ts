import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";

const getSession = vi.fn();
const hasModulePermission = vi.fn();
const fetchCatalogData = vi.fn();

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

vi.mock("@/lib/services/catalog.service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/catalog.service")>(
    "@/lib/services/catalog.service"
  );
  return {
    ...actual,
    fetchCatalogData: (...args: unknown[]) => fetchCatalogData(...args),
  };
});

import { GET } from "@/app/api/catalogs/route";

function jsonRequest(url: string) {
  return new NextRequest(new URL(url, "http://localhost:8080"));
}

describe("GET /api/catalogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hasModulePermission.mockResolvedValue(true);
  });

  it("returns 401 without session", async () => {
    getSession.mockReturnValue(null);
    const res = await GET(jsonRequest("/api/catalogs?catalog=products"));
    expect(res.status).toBe(401);
  });

  it("returns 403 for CLIENT", async () => {
    getSession.mockReturnValue({
      sub: "c1",
      role: UserRole.CLIENT,
      email: "c@test.com",
      name: "Cliente",
    });
    const res = await GET(jsonRequest("/api/catalogs?catalog=products"));
    expect(res.status).toBe(403);
  });

  it("returns 403 when ADMIN lacks PRODUCTS/view", async () => {
    getSession.mockReturnValue({
      sub: "admin",
      role: UserRole.ADMIN,
      email: "a@test.com",
      name: "Admin",
    });
    hasModulePermission.mockResolvedValue(false);
    const res = await GET(jsonRequest("/api/catalogs?catalog=products"));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/permiso/i);
    expect(fetchCatalogData).not.toHaveBeenCalled();
  });
});
