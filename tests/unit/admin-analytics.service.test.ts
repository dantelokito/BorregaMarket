import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrderSource, OrderStatus } from "@prisma/client";
import { Decimal } from "@/lib/money";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    order: {
      count: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    },
    provider: { count: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({ default: prismaMock }));

import { getAdminAnalytics } from "@/lib/services/admin-analytics.service";

describe("getAdminAnalytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty:true with kpis null when no orders were created", async () => {
    prismaMock.order.count.mockResolvedValue(0);
    prismaMock.order.aggregate.mockResolvedValue({
      _sum: { total: null },
      _count: 0,
    });
    prismaMock.order.groupBy.mockResolvedValue([]);
    prismaMock.provider.count.mockResolvedValue(3);

    const result = await getAdminAnalytics({
      range: "7d",
      now: new Date("2026-08-14T18:00:00.000Z"),
    });
    expect(result.empty).toBe(true);
    expect(result.kpis).toBeNull();
    expect(result.timezone).toBe("America/Monterrey");
  });

  it("aggregates GMV excluding cancelled and reports activeProviders live", async () => {
    prismaMock.order.count.mockResolvedValue(48);
    prismaMock.order.aggregate.mockResolvedValue({
      _sum: { total: new Decimal("12500.50") },
      _count: 44,
    });
    prismaMock.order.groupBy.mockResolvedValue([
      {
        source: OrderSource.MARKETPLACE,
        _sum: { total: new Decimal("8200.00") },
        _count: { _all: 30 },
      },
      {
        source: OrderSource.POS,
        _sum: { total: new Decimal("4300.50") },
        _count: { _all: 14 },
      },
    ]);
    prismaMock.provider.count.mockResolvedValue(6);

    const result = await getAdminAnalytics({
      range: "7d",
      now: new Date("2026-08-14T18:00:00.000Z"),
    });
    expect(result.empty).toBe(false);
    expect(result.kpis?.gmv).toBe(12500.5);
    expect(result.kpis?.orderCount).toBe(44);
    expect(result.kpis?.activeProviders).toBe(6);
    expect(result.kpis?.cancellationRate).toBe(Number((4 / 48).toFixed(4)));
    expect(result.kpis?.bySource.MARKETPLACE.orderCount).toBe(30);
    expect(OrderStatus.CANCELLED).toBe("CANCELLED");
  });
});
