import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";

const getSession = vi.fn();
const createLocalProduct = vi.fn();
const updateLocalProduct = vi.fn();
const listProviderSections = vi.fn();
const deleteProviderSection = vi.fn();

vi.mock("@/lib/providers/owned-provider", () => ({
  listOwnedProviders: vi.fn().mockResolvedValue([{ id: "prov1", userId: "u2" }]),
  findOwnedProvider: vi.fn().mockResolvedValue({ id: "prov1", userId: "u2" }),
}));

vi.mock("@/lib/auth/session", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/session")>(
    "@/lib/auth/session"
  );
  return { ...actual, getSession: (...args: unknown[]) => getSession(...args) };
});

vi.mock("@/lib/services/local-product.service", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/services/local-product.service")
  >("@/lib/services/local-product.service");
  return {
    ...actual,
    createLocalProduct: (...args: unknown[]) => createLocalProduct(...args),
    updateLocalProduct: (...args: unknown[]) => updateLocalProduct(...args),
  };
});

vi.mock("@/lib/services/section.service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/section.service")>(
    "@/lib/services/section.service"
  );
  return {
    ...actual,
    listProviderSections: (...args: unknown[]) => listProviderSections(...args),
    deleteProviderSection: (...args: unknown[]) => deleteProviderSection(...args),
  };
});

import { POST as postLocal } from "@/app/api/provider/local-products/route";
import { PATCH as patchLocal } from "@/app/api/provider/local-products/[id]/route";
import { GET as getSections } from "@/app/api/provider/sections/route";
import { DELETE as deleteSection } from "@/app/api/provider/sections/[id]/route";
import {
  CatalogForbiddenError,
  CatalogConflictError,
} from "@/lib/services/local-product.service";

function jsonRequest(url: string, options: { method?: string; body?: unknown } = {}) {
  return new NextRequest(new URL(url, "http://localhost:8080"), {
    method: options.method ?? "GET",
    headers: { "content-type": "application/json" },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

const provider = {
  sub: "u2",
  role: UserRole.PROVIDER,
  email: "p@test.com",
  name: "Carlos",
};

describe("provider local-products + sections (F10)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST local-products 401 without cookie", async () => {
    getSession.mockReturnValue(null);
    const res = await postLocal(
      jsonRequest("/api/provider/local-products", {
        method: "POST",
        body: {
          name: "Chile",
          unit: "KG",
          price: 10,
          sectionId: "clxxxxxxxxxxxxxxxxxxxxxxxx",
        },
      })
    );
    expect(res.status).toBe(401);
  });

  it("POST local-products 403 for CLIENT", async () => {
    getSession.mockReturnValue({
      sub: "c1",
      role: UserRole.CLIENT,
      email: "c@test.com",
      name: "C",
    });
    const res = await postLocal(
      jsonRequest("/api/provider/local-products", {
        method: "POST",
        body: {
          name: "Chile",
          unit: "KG",
          price: 10,
          sectionId: "clxxxxxxxxxxxxxxxxxxxxxxxx",
        },
      })
    );
    expect(res.status).toBe(403);
  });

  it("PATCH local-products IDOR → 403", async () => {
    getSession.mockReturnValue(provider);
    updateLocalProduct.mockRejectedValue(new CatalogForbiddenError());
    const res = await patchLocal(
      jsonRequest("/api/provider/local-products/pp-ajeno", {
        method: "PATCH",
        body: { price: 12 },
      }),
      { params: Promise.resolve({ id: "pp-ajeno" }) }
    );
    expect(res.status).toBe(403);
  });

  it("GET sections 401 without cookie", async () => {
    getSession.mockReturnValue(null);
    const res = await getSections(jsonRequest("/api/provider/sections"));
    expect(res.status).toBe(401);
  });

  it("DELETE section with products → 409", async () => {
    getSession.mockReturnValue(provider);
    deleteProviderSection.mockRejectedValue(
      new CatalogConflictError("La sección tiene productos. Muévelos antes de eliminarla")
    );
    const res = await deleteSection(jsonRequest("/api/provider/sections/s1", { method: "DELETE" }), {
      params: Promise.resolve({ id: "s1" }),
    });
    expect(res.status).toBe(409);
  });
});
