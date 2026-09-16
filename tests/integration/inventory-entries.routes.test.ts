import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { OfferArchivedError } from "@/lib/catalog/offer";

const getSession = vi.fn();
const listOwnedProviders = vi.fn();
const addInventoryEntry = vi.fn();

vi.mock("@/lib/auth/session", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/session")>(
    "@/lib/auth/session"
  );
  return { ...actual, getSession: (...args: unknown[]) => getSession(...args) };
});

vi.mock("@/lib/providers/owned-provider", () => ({
  listOwnedProviders: (...args: unknown[]) => listOwnedProviders(...args),
  findOwnedProvider: vi.fn().mockResolvedValue({
    id: "clxcentro000000000000001",
    userId: "u-paraiso",
  }),
}));

vi.mock("@/lib/services/inventory.service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/inventory.service")>(
    "@/lib/services/inventory.service"
  );
  return {
    ...actual,
    addInventoryEntry: (...args: unknown[]) => addInventoryEntry(...args),
  };
});

import { POST as postEntry } from "@/app/api/provider/inventory/[providerProductId]/entries/route";

function jsonRequest(
  url: string,
  options: { method?: string; body?: unknown; cookie?: string } = {}
) {
  return new NextRequest(new URL(url, "http://localhost:8080"), {
    method: options.method ?? "POST",
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

const params = { params: Promise.resolve({ providerProductId: "pp-visible" }) };

describe("POST /api/provider/inventory/[id]/entries (BUG-020)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSession.mockReturnValue(providerSession);
    listOwnedProviders.mockResolvedValue([centro]);
  });

  it("returns 200 with ficha when the offer is visible", async () => {
    addInventoryEntry.mockResolvedValue({
      providerProductId: "pp-visible",
      productId: "prod1",
      name: "Chile del rancho",
      unit: "KG",
      effectiveSaleUnit: "KG",
      onHand: "1.250",
      lastEntryId: "ent1",
    });
    const res = await postEntry(
      jsonRequest("/api/provider/inventory/pp-visible/entries", {
        method: "POST",
        cookie: "lbm_active_provider=clxcentro000000000000001",
        body: { quantity: "1.250", receiveAs: "CATALOG" },
      }),
      params
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.onHand).toBe("1.250");
    expect(body.data.lastEntryId).toBe("ent1");
    expect(addInventoryEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        providerProductId: "pp-visible",
        input: expect.objectContaining({ quantity: "1.250", receiveAs: "CATALOG" }),
      })
    );
  });

  it("returns 409 Oferta oculta when the offer is archived", async () => {
    addInventoryEntry.mockRejectedValue(new OfferArchivedError());
    const res = await postEntry(
      jsonRequest("/api/provider/inventory/pp-arch/entries", {
        method: "POST",
        cookie: "lbm_active_provider=clxcentro000000000000001",
        body: { quantity: "1.250", receiveAs: "CATALOG" },
      }),
      { params: Promise.resolve({ providerProductId: "pp-arch" }) }
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("Oferta oculta");
    expect(body.details).toEqual([
      {
        field: "providerProductId",
        message: "No se cargan entradas sobre una oferta oculta",
      },
    ]);
  });

  it("returns 400 when quantity is invalid (schema imported)", async () => {
    const res = await postEntry(
      jsonRequest("/api/provider/inventory/pp-visible/entries", {
        method: "POST",
        cookie: "lbm_active_provider=clxcentro000000000000001",
        body: { quantity: "0", receiveAs: "CATALOG" },
      }),
      params
    );
    expect(res.status).toBe(400);
    expect(addInventoryEntry).not.toHaveBeenCalled();
  });
});
