import { beforeEach, describe, expect, it, vi } from "vitest";
import { Decimal } from "@/lib/money";
import { OrderSource, OrderStatus } from "@prisma/client";
import { OrderForbiddenError } from "@/lib/orders/errors";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    providerProduct: { findMany: vi.fn() },
    order: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({ default: prismaMock }));
vi.mock("@/lib/services/order.service", () => ({
  resolveProviderByUserId: vi.fn().mockResolvedValue({
    id: "prov1",
    businessName: "El Paraíso",
  }),
}));

import { getProviderReportRange } from "@/lib/services/dashboard.service";

describe("getProviderReportRange", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when productIds belongs to another business", async () => {
    prismaMock.providerProduct.findMany.mockResolvedValue([]);
    await expect(
      getProviderReportRange({
        userId: "u2",
        from: "2026-08-01",
        to: "2026-08-02",
        productIds: ["clxxxxxxxxxxxxxajeno"],
      })
    ).rejects.toBeInstanceOf(OrderForbiddenError);
  });

  it("excludes CANCELLED from GMV and uses item subtotals", async () => {
    prismaMock.providerProduct.findMany.mockResolvedValue([{ id: "pp1" }]);
    prismaMock.order.findMany.mockResolvedValue([
      {
        id: "o1",
        source: OrderSource.POS,
        status: OrderStatus.DELIVERED,
        createdAt: new Date("2026-08-01T15:00:00.000Z"),
        items: [
          {
            providerProductId: "pp1",
            itemName: "Mango",
            quantity: new Decimal("2"),
            subtotal: new Decimal("80"),
          },
          {
            providerProductId: null,
            itemName: "Venta rápida",
            quantity: new Decimal("1"),
            subtotal: new Decimal("20"),
          },
        ],
      },
    ]);

    const report = await getProviderReportRange({
      userId: "u2",
      from: "2026-08-01",
      to: "2026-08-01",
      productIds: ["pp1"],
      now: new Date("2026-08-28T18:00:00.000Z"),
    });

    expect(report.kpis.gmv).toBe("80.00");
    expect(report.kpis.orderCount).toBe(1);
    expect(report.products).toHaveLength(1);
    expect(report.products?.[0].providerProductId).toBe("pp1");
    expect(report.empty).toBe(false);
  });
});
