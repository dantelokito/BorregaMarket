import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { InventoryNegativeError } from "@/lib/services/inventory.service";
import { CatalogForbiddenError } from "@/lib/services/local-product.service";
import { InvalidOfferPriceError } from "@/lib/catalog/offer";

const getSession = vi.fn();
const listOwnedProviders = vi.fn();
const findOwnedProvider = vi.fn();
const addShrinkage = vi.fn();
const addAdjustment = vi.fn();
const listInventoryMovements = vi.fn();
const patchOfferByProduct = vi.fn();

vi.mock("@/lib/auth/session", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/session")>(
    "@/lib/auth/session"
  );
  return { ...actual, getSession: (...args: unknown[]) => getSession(...args) };
});

vi.mock("@/lib/providers/owned-provider", () => ({
  listOwnedProviders: (...args: unknown[]) => listOwnedProviders(...args),
  findOwnedProvider: (...args: unknown[]) => findOwnedProvider(...args),
}));

vi.mock("@/lib/services/inventory.service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/inventory.service")>(
    "@/lib/services/inventory.service"
  );
  return {
    ...actual,
    addShrinkage: (...args: unknown[]) => addShrinkage(...args),
    addAdjustment: (...args: unknown[]) => addAdjustment(...args),
    listInventoryMovements: (...args: unknown[]) => listInventoryMovements(...args),
  };
});

vi.mock("@/lib/services/product.service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/product.service")>(
    "@/lib/services/product.service"
  );
  return {
    ...actual,
    patchOfferByProduct: (...args: unknown[]) => patchOfferByProduct(...args),
  };
});

import { POST as postShrinkage } from "@/app/api/provider/inventory/[providerProductId]/shrinkage/route";
import { POST as postAdjustment } from "@/app/api/provider/inventory/[providerProductId]/adjustments/route";
import { GET as getMovements } from "@/app/api/provider/inventory/movements/route";
import { PATCH as patchOffer } from "@/app/api/provider/products/by-product/[productId]/route";

function jsonRequest(
  url: string,
  options: { method?: string; body?: unknown; cookie?: string } = {}
) {
  return new NextRequest(new URL(url, "http://localhost:8080"), {
    method: options.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...(options.cookie ? { cookie: options.cookie } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

const centro = {
  id: "clxcentro000000000000001",
  userId: "u-paraiso",
  businessName: "El Paraíso Centro",
  address: "Centro",
  isActive: true,
  primaryColor: null,
  secondaryColor: null,
  posShowImages: true,
};

const providerSession = {
  sub: "u-paraiso",
  role: UserRole.PROVIDER,
  email: "frutas@elparaiso.mx",
  name: "Carlos",
};

const cookie = "lbm_active_provider=clxcentro000000000000001";
const ppParams = { params: Promise.resolve({ providerProductId: "pp1" }) };

describe("F14 inventory + offer routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSession.mockReturnValue(providerSession);
    listOwnedProviders.mockResolvedValue([centro]);
    findOwnedProvider.mockResolvedValue(centro);
  });

  it("POST shrinkage returns 400 INVENTORY_NEGATIVE_NOT_ALLOWED", async () => {
    addShrinkage.mockRejectedValue(new InventoryNegativeError());
    const res = await postShrinkage(
      jsonRequest("/api/provider/inventory/pp1/shrinkage", {
        method: "POST",
        cookie,
        body: { quantity: "4", reason: "CADUCIDAD" },
      }),
      ppParams
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVENTORY_NEGATIVE_NOT_ALLOWED");
  });

  it("POST adjustment returns 400 for negative count (Zod)", async () => {
    const res = await postAdjustment(
      jsonRequest("/api/provider/inventory/pp1/adjustments", {
        method: "POST",
        cookie,
        body: { countedOnHand: "-1" },
      }),
      ppParams
    );
    expect(res.status).toBe(400);
    expect(addAdjustment).not.toHaveBeenCalled();
  });

  it("POST shrinkage IDOR → 403", async () => {
    addShrinkage.mockRejectedValue(new CatalogForbiddenError());
    const res = await postShrinkage(
      jsonRequest("/api/provider/inventory/pp-tec/shrinkage", {
        method: "POST",
        cookie,
        body: { quantity: "1", reason: "ROBO" },
      }),
      { params: Promise.resolve({ providerProductId: "pp-tec" }) }
    );
    expect(res.status).toBe(403);
  });

  it("GET movements 200 empty", async () => {
    listInventoryMovements.mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 50, total: 0, totalPages: 0 },
    });
    const res = await getMovements(
      jsonRequest("/api/provider/inventory/movements?page=1&limit=50", { cookie })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
    expect(body.meta.total).toBe(0);
  });

  it("PATCH offer with price 0 when publishing → 400", async () => {
    patchOfferByProduct.mockRejectedValue(new InvalidOfferPriceError());
    const res = await patchOffer(
      jsonRequest("/api/provider/products/by-product/prod1", {
        method: "PATCH",
        cookie,
        body: { isAvailable: true, price: "0" },
      }),
      { params: Promise.resolve({ productId: "prod1" }) }
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Precio de venta inválido");
  });
});
