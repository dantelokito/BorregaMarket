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

import { getProviderDashboard, getProviderReport } from "@/lib/services/dashboard.service";

function emptyAgg() {
  return { _sum: { total: new Decimal(0) }, _count: 0 };
}

describe("getProviderDashboard topProducts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.provider.findUnique.mockResolvedValue({
      id: "prov1",
      userId: "u2",
      businessName: "Frutas El Paraíso",
    });
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

describe("getProviderReport", () => {
  const now = new Date("2026-08-16T23:41:00.000Z");

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.provider.findUnique.mockResolvedValue({
      id: "prov1",
      userId: "u2",
      businessName: "Frutas El Paraíso",
    });
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

  it("returns empty KPIs in 0.00 and both bySource keys", async () => {
    const result = await getProviderReport({
      userId: "u2",
      grain: "day",
      date: "2026-08-10",
      now,
    });

    expect(result.empty).toBe(true);
    expect(result.kpis).toEqual({
      gmv: "0.00",
      avgTicket: "0.00",
      orderCount: 0,
      bySource: {
        MARKETPLACE: { gmv: "0.00", orderCount: 0 },
        POS: { gmv: "0.00", orderCount: 0 },
      },
    });
    expect(result.series).toEqual([]);
    expect(result.provider).toEqual({
      id: "prov1",
      businessName: "Frutas El Paraíso",
    });
    expect(prismaMock.order.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ providerId: "prov1" }),
      })
    );
  });

  it("builds day, month and year windows in America/Monterrey", async () => {
    const day = await getProviderReport({
      userId: "u2",
      grain: "day",
      date: "2026-08-16",
      now,
    });
    expect(day.period).toMatchObject({
      grain: "day",
      date: "2026-08-16",
      from: "2026-08-16T06:00:00.000Z",
      to: "2026-08-17T06:00:00.000Z",
    });
    expect(day.series).toEqual([]);

    const month = await getProviderReport({
      userId: "u2",
      grain: "month",
      date: "2026-08",
      now,
    });
    expect(month.period.from).toBe("2026-08-01T06:00:00.000Z");
    expect(month.period.to).toBe("2026-09-01T06:00:00.000Z");
    expect(month.series).toHaveLength(31);
    expect(month.series[0]).toEqual({ bucket: "2026-08-01", gmv: "0.00", orderCount: 0 });
    expect(month.series.at(-1)?.bucket).toBe("2026-08-31");

    const year = await getProviderReport({
      userId: "u2",
      grain: "year",
      date: "2026",
      now,
    });
    expect(year.period.from).toBe("2026-01-01T06:00:00.000Z");
    expect(year.period.to).toBe("2027-01-01T06:00:00.000Z");
    expect(year.series).toHaveLength(12);
    expect(year.series[0].bucket).toBe("2026-01");
    expect(year.series[11]).toEqual({ bucket: "2026-12", gmv: "0.00", orderCount: 0 });
  });

  it("keeps venta rápida in topProducts and filters unavailable catalog rows", async () => {
    const result = await getProviderReport({
      userId: "u2",
      grain: "month",
      date: "2026-08",
      now,
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
  });

  it("computes avgTicket from GMV and always includes MARKETPLACE and POS", async () => {
    prismaMock.order.aggregate.mockResolvedValue({
      _sum: { total: new Decimal("12500.50") },
      _count: 48,
    });
    prismaMock.order.groupBy.mockResolvedValue([
      { source: "MARKETPLACE", _sum: { total: new Decimal("8200.00") }, _count: 30 },
      { source: "POS", _sum: { total: new Decimal("4300.50") }, _count: 18 },
    ]);

    const result = await getProviderReport({
      userId: "u2",
      grain: "month",
      date: "2026-08",
      now,
    });

    expect(result.empty).toBe(false);
    expect(result.kpis.gmv).toBe("12500.50");
    expect(result.kpis.avgTicket).toBe("260.43");
    expect(result.kpis.orderCount).toBe(48);
    expect(result.kpis.bySource.MARKETPLACE).toEqual({ gmv: "8200.00", orderCount: 30 });
    expect(result.kpis.bySource.POS).toEqual({ gmv: "4300.50", orderCount: 18 });
  });
});
