import { beforeEach, describe, expect, it, vi } from "vitest";
import { Decimal } from "@/lib/money";

const findOwnedProvider = vi.fn();

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    providerProduct: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    orderItem: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({ default: prismaMock }));
vi.mock("@/lib/providers/owned-provider", () => ({
  findOwnedProvider: (...args: unknown[]) => findOwnedProvider(...args),
  listOwnedProviders: vi.fn(),
}));

import { addInventoryEntry, listInventory } from "@/lib/services/inventory.service";
import { CatalogForbiddenError } from "@/lib/services/local-product.service";

describe("inventory.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findOwnedProvider.mockResolvedValue({ id: "centro", userId: "u-paraiso" });
    prismaMock.orderItem.findMany.mockResolvedValue([]);
  });

  it("lists inventory of the active sucursal", async () => {
    prismaMock.providerProduct.count.mockResolvedValue(1);
    prismaMock.providerProduct.findMany.mockResolvedValue([
      {
        id: "pp1",
        productId: "prod1",
        isAvailable: true,
        imageUrl: null,
        onHand: new Decimal("12.5"),
        capacityMax: new Decimal("20"),
        alertThresholdPercent: 10,
        alertEnabled: true,
        boxContentFactor: new Decimal("10"),
        product: { name: "Mango Ataulfo", unit: "KG", imageUrl: null },
      },
    ]);

    const result = await listInventory({
      userId: "u-paraiso",
      providerId: "centro",
      page: 1,
      limit: 50,
      skip: 0,
    });
    expect(result.data[0].onHand).toBe("12.500");
    expect(result.data[0].fillPercent).toBe(62.5);
    expect(result.meta.total).toBe(1);
  });

  it("rejects a product of another sucursal", async () => {
    prismaMock.providerProduct.findUnique.mockResolvedValue({
      id: "pp-tec",
      providerId: "tec",
      product: { name: "Mango", unit: "KG", imageUrl: null },
    });
    const { getInventoryItem } = await import("@/lib/services/inventory.service");
    await expect(
      getInventoryItem({
        userId: "u-paraiso",
        providerId: "centro",
        providerProductId: "pp-tec",
      })
    ).rejects.toBeInstanceOf(CatalogForbiddenError);
  });

  it("adds BOX entries using the stored factor", async () => {
    prismaMock.providerProduct.findUnique.mockResolvedValue({
      id: "pp1",
      providerId: "centro",
      productId: "prod1",
      isAvailable: true,
      imageUrl: null,
      onHand: new Decimal("1"),
      capacityMax: null,
      alertThresholdPercent: 10,
      alertEnabled: true,
      boxContentFactor: new Decimal("10"),
      product: { name: "Mango", unit: "KG", imageUrl: null },
    });
    prismaMock.providerProduct.update.mockResolvedValue({
      id: "pp1",
      productId: "prod1",
      isAvailable: true,
      imageUrl: null,
      onHand: new Decimal("21"),
      capacityMax: null,
      alertThresholdPercent: 10,
      alertEnabled: true,
      boxContentFactor: new Decimal("10"),
      product: { name: "Mango", unit: "KG", imageUrl: null },
    });

    const row = await addInventoryEntry({
      userId: "u-paraiso",
      providerId: "centro",
      providerProductId: "pp1",
      input: { quantity: "2", receiveAs: "BOX" },
    });
    expect(prismaMock.providerProduct.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { onHand: { increment: expect.anything() } },
      })
    );
    expect(row.onHand).toBe("21.000");
  });
});
