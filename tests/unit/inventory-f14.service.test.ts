import { beforeEach, describe, expect, it, vi } from "vitest";
import { Decimal } from "@/lib/money";
import { InventoryEntryKind } from "@prisma/client";

const findOwnedProvider = vi.fn();

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    providerProduct: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    inventoryEntry: {
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
    orderItem: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ default: prismaMock }));
vi.mock("@/lib/providers/owned-provider", () => ({
  findOwnedProvider: (...args: unknown[]) => findOwnedProvider(...args),
  listOwnedProviders: vi.fn(),
}));
vi.mock("@/lib/audit", () => ({
  writeAuditLog: vi.fn().mockResolvedValue("audit1"),
}));

import {
  addAdjustment,
  addShrinkage,
  InventoryNegativeError,
  listInventoryMovements,
} from "@/lib/services/inventory.service";
import { CatalogForbiddenError } from "@/lib/services/local-product.service";

const offer = {
  id: "pp1",
  providerId: "centro",
  productId: "prod1",
  isAvailable: true,
  imageUrl: null,
  onHand: new Decimal("3"),
  capacityMax: null,
  alertThresholdPercent: 10,
  alertEnabled: true,
  boxContentFactor: null,
  saleUnit: null,
  archivedAt: null,
  product: { name: "Mango Ataulfo", unit: "KG", imageUrl: null },
};

describe("inventory F14 merma/ajuste", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findOwnedProvider.mockResolvedValue({ id: "centro", userId: "u-paraiso" });
    prismaMock.providerProduct.findUnique.mockResolvedValue(offer);
    prismaMock.$transaction.mockImplementation(async (cb: (tx: unknown) => unknown) => {
      const tx = {
        inventoryEntry: { create: prismaMock.inventoryEntry.create },
        providerProduct: {
          findUnique: prismaMock.providerProduct.findUnique,
          update: prismaMock.providerProduct.update,
        },
      };
      return cb(tx);
    });
  });

  it("rejects merma that would leave onHand negative", async () => {
    await expect(
      addShrinkage({
        userId: "u-paraiso",
        providerId: "centro",
        providerProductId: "pp1",
        input: { quantity: "4", reason: "CADUCIDAD" },
      })
    ).rejects.toBeInstanceOf(InventoryNegativeError);
    expect(prismaMock.inventoryEntry.create).not.toHaveBeenCalled();
    expect(prismaMock.providerProduct.update).not.toHaveBeenCalled();
  });

  it("persists merma when stock is enough", async () => {
    prismaMock.inventoryEntry.create.mockResolvedValue({
      id: "clxmerma01",
      createdAt: new Date("2026-09-17T18:00:00.000Z"),
    });
    prismaMock.providerProduct.update.mockResolvedValue({
      ...offer,
      onHand: new Decimal("1"),
    });
    const row = await addShrinkage({
      userId: "u-paraiso",
      providerId: "centro",
      providerProductId: "pp1",
      input: { quantity: "2", reason: "CADUCIDAD", note: "Caja golpeada" },
    });
    expect(row.kind).toBe(InventoryEntryKind.MERMA);
    expect(row.onHand).toBe("1.000");
    expect(row.appliedDelta).toBe("-2.000");
  });

  it("rejects a negative physical count", async () => {
    await expect(
      addAdjustment({
        userId: "u-paraiso",
        providerId: "centro",
        providerProductId: "pp1",
        input: { countedOnHand: "-1" },
      })
    ).rejects.toMatchObject({ name: "InventoryValidationError" });
    expect(prismaMock.inventoryEntry.create).not.toHaveBeenCalled();
  });

  it("sets onHand to the counted value", async () => {
    prismaMock.inventoryEntry.create.mockResolvedValue({
      id: "clxaj01",
      createdAt: new Date("2026-09-17T18:05:00.000Z"),
    });
    prismaMock.providerProduct.update.mockResolvedValue({
      ...offer,
      onHand: new Decimal("0"),
    });
    const row = await addAdjustment({
      userId: "u-paraiso",
      providerId: "centro",
      providerProductId: "pp1",
      input: { countedOnHand: "0", note: "Conteo anaquel" },
    });
    expect(row.kind).toBe(InventoryEntryKind.AJUSTE);
    expect(row.onHand).toBe("0.000");
    expect(row.appliedDelta).toBe("-3.000");
  });

  it("rejects merma on another sucursal (IDOR)", async () => {
    prismaMock.providerProduct.findUnique.mockResolvedValue({
      ...offer,
      providerId: "tec",
    });
    await expect(
      addShrinkage({
        userId: "u-paraiso",
        providerId: "centro",
        providerProductId: "pp-tec",
        input: { quantity: "1", reason: "ROBO" },
      })
    ).rejects.toBeInstanceOf(CatalogForbiddenError);
  });
});

describe("listInventoryMovements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findOwnedProvider.mockResolvedValue({ id: "centro", userId: "u-paraiso" });
  });

  it("lists ENTRADA+MERMA+AJUSTE of the active sucursal", async () => {
    prismaMock.inventoryEntry.count.mockResolvedValue(1);
    prismaMock.inventoryEntry.findMany.mockResolvedValue([
      {
        id: "clxmerma01",
        providerProductId: "pp1",
        kind: InventoryEntryKind.MERMA,
        quantity: new Decimal("2"),
        receiveAs: null,
        appliedDelta: new Decimal("-2"),
        onHandAfter: new Decimal("1"),
        reason: "CADUCIDAD",
        note: null,
        createdAt: new Date("2026-09-17T18:00:00.000Z"),
        providerProduct: { product: { name: "Mango Ataulfo" } },
      },
    ]);
    const result = await listInventoryMovements({
      userId: "u-paraiso",
      providerId: "centro",
      page: 1,
      limit: 50,
      skip: 0,
    });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].kind).toBe("MERMA");
    expect(result.data[0].appliedDelta).toBe("-2.000");
    expect(result.meta.total).toBe(1);
  });
});
