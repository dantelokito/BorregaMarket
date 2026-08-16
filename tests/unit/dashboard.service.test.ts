import { beforeEach, describe, expect, it, vi } from "vitest";
import { Decimal } from "@/lib/money";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    provider: { findUnique: vi.fn() },
    order: {
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ default: prismaMock }));

import { getProviderDashboard } from "@/lib/services/dashboard.service";

function emptyAgg() {
  return { _sum: { total: new Decimal(0) }, _count: 0 };
}

describe("getProviderDashboard topProducts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.provider.findUnique.mockResolvedValue({ id: "prov1", userId: "u2" });
    prismaMock.order.aggregate.mockResolvedValue(emptyAgg());
    prismaMock.order.groupBy.mockResolvedValue([]);
    prismaMock.$queryRaw.mockImplementation((strings: TemplateStringsArray) => {
      const sql = Array.from(strings).join(" ");
      if (sql.includes("provider_product_id")) {
        return Promise.resolve([
          {
            provider_product_id: null,
            name: "Venta rápida",
            sales_total: new Decimal("20"),
            quantity_sum: new Decimal("2"),
          },
        ]);
      }
      return Promise.resolve([]);
    });
  });

  it("filters topProducts to available catalog rows and keeps venta rápida", async () => {
    const result = await getProviderDashboard({
      userId: "u2",
      now: new Date("2026-08-14T18:00:00.000Z"),
    });

    const topSql = prismaMock.$queryRaw.mock.calls
      .map((call) => Array.from(call[0] as TemplateStringsArray).join(" "))
      .find((sql) => sql.includes("provider_product_id"));

    expect(topSql).toContain("LEFT JOIN provider_products");
    expect(topSql).toContain("is_available = true");
    expect(topSql).toContain("provider_product_id IS NULL");
    expect(result.topProducts).toEqual([
      {
        providerProductId: null,
        name: "Venta rápida",
        salesTotal: "20.00",
        quantitySum: "2.000",
      },
    ]);
    expect(result.kpis.bySource.marketplace).toEqual({
      salesTotal: "0.00",
      orderCount: 0,
    });
  });
});
