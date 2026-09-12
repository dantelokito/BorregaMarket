import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductScope } from "@prisma/client";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    product: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    providerProduct: { count: vi.fn() },
    orderItem: { count: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({ default: prismaMock }));

import { fetchCatalogData } from "@/lib/services/catalog.service";
import { assertProductHardDeleteAllowed, ProductDeleteForbiddenError } from "@/lib/services/admin-product.service";

describe("catalogs products F10", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.product.findMany.mockResolvedValue([]);
  });

  it("filters scope GLOBAL", async () => {
    await fetchCatalogData("products");
    expect(prismaMock.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { scope: ProductScope.GLOBAL },
      })
    );
  });
});

describe("assertProductHardDeleteAllowed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws 409 when ProviderProduct exists", async () => {
    prismaMock.providerProduct.count.mockResolvedValue(1);
    prismaMock.orderItem.count.mockResolvedValue(0);
    await expect(assertProductHardDeleteAllowed("prod1")).rejects.toBeInstanceOf(
      ProductDeleteForbiddenError
    );
  });
});
