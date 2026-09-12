import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";

const getSession = vi.fn();
const hasModulePermission = vi.fn();
const listAdminProducts = vi.fn();
const createAdminProduct = vi.fn();
const updateAdminProduct = vi.fn();

vi.mock("@/lib/auth/session", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/session")>(
    "@/lib/auth/session"
  );
  return { ...actual, getSession: (...args: unknown[]) => getSession(...args) };
});

vi.mock("@/lib/auth/permissions", () => ({
  hasModulePermission: (...args: unknown[]) => hasModulePermission(...args),
}));

vi.mock("@/lib/services/admin-product.service", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/services/admin-product.service")
  >("@/lib/services/admin-product.service");
  return {
    ...actual,
    listAdminProducts: (...args: unknown[]) => listAdminProducts(...args),
    createAdminProduct: (...args: unknown[]) => createAdminProduct(...args),
    updateAdminProduct: (...args: unknown[]) => updateAdminProduct(...args),
  };
});

import { GET, POST } from "@/app/api/admin/products/route";
import { DELETE, PATCH } from "@/app/api/admin/products/[id]/route";

function jsonRequest(url: string, options: { method?: string; body?: unknown } = {}) {
  return new NextRequest(new URL(url, "http://localhost:8080"), {
    method: options.method ?? "GET",
    headers: { "content-type": "application/json" },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

const admin = {
  sub: "admin1",
  role: UserRole.ADMIN,
  email: "a@test.com",
  name: "Admin",
};

describe("GET/POST /api/admin/products", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hasModulePermission.mockResolvedValue(true);
  });

  it("returns 401 without session", async () => {
    getSession.mockReturnValue(null);
    const res = await GET(jsonRequest("/api/admin/products"));
    expect(res.status).toBe(401);
  });

  it("returns 403 for CLIENT", async () => {
    getSession.mockReturnValue({
      sub: "c1",
      role: UserRole.CLIENT,
      email: "c@test.com",
      name: "C",
    });
    const res = await GET(jsonRequest("/api/admin/products"));
    expect(res.status).toBe(403);
  });

  it("returns 403 when ADMIN lacks PRODUCTS/view", async () => {
    getSession.mockReturnValue(admin);
    hasModulePermission.mockResolvedValue(false);
    const res = await GET(jsonRequest("/api/admin/products"));
    expect(res.status).toBe(403);
    expect(listAdminProducts).not.toHaveBeenCalled();
  });

  it("creates GLOBAL product with 201", async () => {
    getSession.mockReturnValue(admin);
    createAdminProduct.mockResolvedValue({
      id: "p1",
      name: "Mango",
      slug: "mango",
      scope: "GLOBAL",
    });
    const res = await POST(
      jsonRequest("/api/admin/products", {
        method: "POST",
        body: { name: "Mango", category: "FRUTA", unit: "KG" },
      })
    );
    expect(res.status).toBe(201);
  });
});

describe("PATCH/DELETE /api/admin/products/[id]", () => {
  const params = { params: Promise.resolve({ id: "prod1" }) };

  beforeEach(() => {
    vi.clearAllMocks();
    hasModulePermission.mockResolvedValue(true);
    getSession.mockReturnValue(admin);
  });

  it("DELETE returns 405", async () => {
    const res = await DELETE();
    expect(res.status).toBe(405);
  });

  it("PATCH returns 401 without session", async () => {
    getSession.mockReturnValue(null);
    const res = await PATCH(
      jsonRequest("/api/admin/products/prod1", {
        method: "PATCH",
        body: { isActive: false },
      }),
      params
    );
    expect(res.status).toBe(401);
  });
});
