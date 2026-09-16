import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { methodNotAllowedDeleteProduct } from "@/lib/api/method-not-allowed";

const getSession = vi.fn();
const listOwnedProviders = vi.fn();
const archiveProviderOffer = vi.fn();
const restoreProviderOffer = vi.fn();

vi.mock("@/lib/auth/session", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/session")>(
    "@/lib/auth/session"
  );
  return { ...actual, getSession: (...args: unknown[]) => getSession(...args) };
});

vi.mock("@/lib/providers/owned-provider", () => ({
  listOwnedProviders: (...args: unknown[]) => listOwnedProviders(...args),
  findOwnedProvider: vi.fn().mockResolvedValue({ id: "clxcentro000000000000001", userId: "u2" }),
}));

vi.mock("@/lib/services/product.service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/product.service")>(
    "@/lib/services/product.service"
  );
  return {
    ...actual,
    archiveProviderOffer: (...args: unknown[]) => archiveProviderOffer(...args),
    restoreProviderOffer: (...args: unknown[]) => restoreProviderOffer(...args),
  };
});

import { POST as archive } from "@/app/api/provider/products/by-product/[productId]/archive/route";
import { POST as restore } from "@/app/api/provider/products/by-product/[productId]/restore/route";
import { DELETE as deleteAdmin } from "@/app/api/admin/products/[id]/route";
import { DELETE as deleteProviderProducts } from "@/app/api/provider/products/route";
import { RestoreOfferNotFoundError } from "@/lib/catalog/offer";

function jsonRequest(url: string, options: { method?: string; cookie?: string } = {}) {
  return new NextRequest(new URL(url, "http://localhost:8080"), {
    method: options.method ?? "POST",
    headers: {
      "content-type": "application/json",
      ...(options.cookie ? { cookie: options.cookie } : {}),
    },
  });
}

const provider = {
  sub: "u2",
  role: UserRole.PROVIDER,
  email: "p@test.com",
  name: "Carlos",
};

const centro = {
  id: "clxcentro000000000000001",
  userId: "u2",
  businessName: "El Paraíso",
  address: "Centro",
  isActive: true,
  primaryColor: null,
  secondaryColor: null,
};

describe("F13 archive / DELETE 405", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listOwnedProviders.mockResolvedValue([centro]);
    getSession.mockReturnValue(provider);
  });

  it("archives with 200 even if Encargar would exist (service called)", async () => {
    archiveProviderOffer.mockResolvedValue({
      productId: "prod1",
      providerProductId: "pp1",
      archivedAt: "2026-09-16T18:00:00.000Z",
      createdStub: false,
    });
    const res = await archive(
      jsonRequest("/api/provider/products/by-product/prod1/archive", {
        cookie: "lbm_active_provider=clxcentro000000000000001",
      }),
      { params: Promise.resolve({ productId: "prod1" }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.createdStub).toBe(false);
  });

  it("restore without offer returns 404", async () => {
    restoreProviderOffer.mockRejectedValue(new RestoreOfferNotFoundError());
    const res = await restore(
      jsonRequest("/api/provider/products/by-product/prod1/restore", {
        cookie: "lbm_active_provider=clxcentro000000000000001",
      }),
      { params: Promise.resolve({ productId: "prod1" }) }
    );
    expect(res.status).toBe(404);
  });

  it("admin DELETE is 405 with product copy", async () => {
    const res = await deleteAdmin();
    expect(res.status).toBe(405);
    const body = await res.json();
    expect(body.error).toBe("No se puede eliminar el producto");
  });

  it("provider DELETE catalog is 405", async () => {
    const res = await deleteProviderProducts();
    expect(res.status).toBe(405);
  });

  it("helper encodes admin vs provider details", async () => {
    const admin = methodNotAllowedDeleteProduct("PATCH", "admin");
    const json = await admin.json();
    expect(json.details[0].message).toContain("isActive");
  });
});
