import { beforeEach, describe, expect, it, vi } from "vitest";
import { Decimal } from "@/lib/money";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    provider: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({ default: prismaMock }));
vi.mock("@/lib/audit", () => ({
  writeAuditLog: vi.fn().mockResolvedValue("audit1"),
}));

import {
  getProviderDetail,
  sellableProviderProductWhere,
  updateProviderSettings,
} from "@/lib/services/provider.service";
import { GoogleReviewsLockedError } from "@/lib/services/provider.service";

describe("sellableProviderProductWhere", () => {
  it("requires isAvailable and Product.isActive", () => {
    expect(sellableProviderProductWhere).toEqual({
      isAvailable: true,
      product: { isActive: true },
    });
  });
});

describe("getProviderDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queries only sellable products", async () => {
    prismaMock.provider.findFirst.mockResolvedValue({
      id: "p1",
      businessName: "El Paraíso",
      description: null,
      address: "Av. 1",
      city: "Monterrey",
      state: "Nuevo León",
      latitude: 25.67,
      longitude: -100.31,
      phone: "+5281",
      logoUrl: null,
      coverUrl: null,
      rating: 0,
      reviewCount: 0,
      isVerified: true,
      preparationTimeMinutes: 20,
      offersDelivery: false,
      googlePlaceId: null,
      googleMapsUrl: null,
      googleReviewsEnabled: false,
      providerProducts: [
        {
          id: "pp1",
          isAvailable: true,
          price: new Decimal("45"),
          product: {
            id: "prod1",
            name: "Mango",
            slug: "mango",
            category: "FRUTA",
            unit: "KG",
            imageUrl: null,
          },
        },
      ],
    });

    const detail = await getProviderDetail("p1");
    expect(prismaMock.provider.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          providerProducts: expect.objectContaining({
            where: sellableProviderProductWhere,
          }),
        }),
      })
    );
    expect(detail.products).toHaveLength(1);
    expect(detail.products[0].isAvailable).toBe(true);
  });
});

describe("updateProviderSettings brand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.provider.findUnique.mockResolvedValue({
      id: "p1",
      userId: "u2",
      isVerified: false,
      googlePlaceId: null,
      googleMapsUrl: null,
      googleReviewsEnabled: false,
      preparationTimeMinutes: 20,
      offersDelivery: false,
      businessName: "El Paraíso",
      address: "Av. 1",
      city: "Monterrey",
      latitude: 25.67,
      longitude: -100.31,
      phone: "+5281",
      description: null,
      isActive: true,
      logoUrl: null,
      coverUrl: null,
    });
  });

  it("persists canonical colors without triggering Google lock", async () => {
    prismaMock.provider.update.mockResolvedValue({
      id: "p1",
      businessName: "El Paraíso",
      address: "Av. 1",
      city: "Monterrey",
      latitude: 25.67,
      longitude: -100.31,
      phone: "+5281",
      description: null,
      isVerified: false,
      isActive: true,
      logoUrl: null,
      coverUrl: null,
      preparationTimeMinutes: 20,
      offersDelivery: false,
      googlePlaceId: null,
      googleMapsUrl: null,
      googleReviewsEnabled: false,
      primaryColor: "#1B5E20",
      secondaryColor: "#0D47A1",
    });

    const result = await updateProviderSettings({
      userId: "u2",
      input: { primaryColor: "#1b5e20", secondaryColor: "#0d47a1" },
    });

    expect(prismaMock.provider.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          primaryColor: "#1B5E20",
          secondaryColor: "#0D47A1",
        }),
      })
    );
    expect(result.primaryColor).toBe("#1B5E20");
    expect(result.secondaryColor).toBe("#0D47A1");
  });

  it("resets both colors to null", async () => {
    prismaMock.provider.update.mockResolvedValue({
      id: "p1",
      businessName: "El Paraíso",
      address: "Av. 1",
      city: "Monterrey",
      latitude: 25.67,
      longitude: -100.31,
      phone: "+5281",
      description: null,
      isVerified: false,
      isActive: true,
      logoUrl: null,
      coverUrl: null,
      preparationTimeMinutes: 20,
      offersDelivery: false,
      googlePlaceId: null,
      googleMapsUrl: null,
      googleReviewsEnabled: false,
      primaryColor: null,
      secondaryColor: null,
    });

    const result = await updateProviderSettings({
      userId: "u2",
      input: { primaryColor: null, secondaryColor: null },
    });
    expect(result.primaryColor).toBeNull();
    expect(result.secondaryColor).toBeNull();
  });

  it("still locks Google fields when unverified", async () => {
    await expect(
      updateProviderSettings({
        userId: "u2",
        input: { googleReviewsEnabled: true, googlePlaceId: "ChIJN1t_tDeuXX" },
      })
    ).rejects.toBeInstanceOf(GoogleReviewsLockedError);
    expect(prismaMock.provider.update).not.toHaveBeenCalled();
  });
});
