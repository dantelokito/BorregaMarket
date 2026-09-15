import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";

const getSession = vi.fn();
const listOwnedProviders = vi.fn();
const findOwnedProvider = vi.fn();
const listInventory = vi.fn();
const getInventoryItem = vi.fn();
const patchInventoryItem = vi.fn();
const updateProviderSettings = vi.fn();

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
    listInventory: (...args: unknown[]) => listInventory(...args),
    getInventoryItem: (...args: unknown[]) => getInventoryItem(...args),
    patchInventoryItem: (...args: unknown[]) => patchInventoryItem(...args),
  };
});

vi.mock("@/lib/services/provider.service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/provider.service")>(
    "@/lib/services/provider.service"
  );
  return {
    ...actual,
    updateProviderSettings: (...args: unknown[]) => updateProviderSettings(...args),
  };
});

import { GET as getInventory } from "@/app/api/provider/inventory/route";
import { GET as getInventoryItemRoute } from "@/app/api/provider/inventory/[providerProductId]/route";
import { PATCH as patchMe } from "@/app/api/provider/me/route";
import { CatalogForbiddenError } from "@/lib/services/local-product.service";

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
const tec = {
  id: "clxtecno0000000000000002",
  userId: "u-paraiso",
  businessName: "El Paraíso Tecnológico",
  address: "Tec",
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

describe("F12 inventory ISO + posShowImages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSession.mockReturnValue(providerSession);
    listOwnedProviders.mockResolvedValue([centro, tec]);
    findOwnedProvider.mockImplementation(async (_userId: string, id?: string) => {
      if (id === centro.id) return centro;
      if (id === tec.id) return tec;
      return centro;
    });
  });

  it("GET inventory returns 401 without JWT", async () => {
    getSession.mockReturnValue(null);
    const res = await getInventory(jsonRequest("/api/provider/inventory"));
    expect(res.status).toBe(401);
  });

  it("GET inventory returns 403 for CLIENT", async () => {
    getSession.mockReturnValue({
      sub: "c1",
      role: UserRole.CLIENT,
      email: "c@test.com",
      name: "María",
    });
    const res = await getInventory(jsonRequest("/api/provider/inventory"));
    expect(res.status).toBe(403);
  });

  it("GET inventory item of Tecnológico while Centro is active returns 403", async () => {
    getInventoryItem.mockRejectedValue(new CatalogForbiddenError());
    const res = await getInventoryItemRoute(
      jsonRequest("/api/provider/inventory/pp-tec", {
        cookie: "lbm_active_provider=clxcentro000000000000001",
      }),
      { params: Promise.resolve({ providerProductId: "pp-tec" }) }
    );
    expect(res.status).toBe(403);
  });

  it("PATCH me posShowImages of Tecnológico while Centro is active returns 403", async () => {
    updateProviderSettings.mockRejectedValue(new CatalogForbiddenError());
    const res = await patchMe(
      jsonRequest("/api/provider/me", {
        method: "PATCH",
        cookie: "lbm_active_provider=clxcentro000000000000001",
        body: { posShowImages: false, providerId: tec.id },
      })
    );
    expect(res.status).toBe(403);
  });

  it("GET inventory 200 for Centro", async () => {
    listInventory.mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 50, total: 0, totalPages: 0 },
    });
    const res = await getInventory(
      jsonRequest("/api/provider/inventory", {
        cookie: "lbm_active_provider=clxcentro000000000000001",
      })
    );
    expect(res.status).toBe(200);
    expect(listInventory).toHaveBeenCalledWith(
      expect.objectContaining({ providerId: centro.id })
    );
  });
});
