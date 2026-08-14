import {
  OrderSource,
  OrderStatus,
  Prisma,
} from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  DASHBOARD_TZ,
  rollingWindowUtc,
  ymdInTimeZone,
} from "@/lib/timezone";
import type { AnalyticsRange } from "@/lib/validators/analytics";

function windowForRange(range: AnalyticsRange, now: Date) {
  const todayYmd = ymdInTimeZone(now, DASHBOARD_TZ);
  const days = range === "today" ? 1 : range === "7d" ? 7 : 30;
  return rollingWindowUtc(todayYmd, days);
}

function asMoney(value: Prisma.Decimal | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

export async function getAdminAnalytics(params: {
  range: AnalyticsRange;
  now?: Date;
}) {
  const now = params.now ?? new Date();
  const { start, end } = windowForRange(params.range, now);
  const period: Prisma.OrderWhereInput = {
    createdAt: { gte: start, lt: end },
  };

  const [allCreatedCount, notCancelled, bySourceRows, activeProviders] =
    await Promise.all([
      prisma.order.count({ where: period }),
      prisma.order.aggregate({
        where: { ...period, status: { not: OrderStatus.CANCELLED } },
        _sum: { total: true },
        _count: true,
      }),
      prisma.order.groupBy({
        by: ["source"],
        where: { ...period, status: { not: OrderStatus.CANCELLED } },
        _sum: { total: true },
        _count: { _all: true },
      }),
      prisma.provider.count({ where: { isActive: true } }),
    ]);

  const cancelledCount = allCreatedCount - notCancelled._count;
  const cancellationRate =
    allCreatedCount === 0 ? 0 : cancelledCount / allCreatedCount;

  const bySource = {
    MARKETPLACE: { gmv: 0, orderCount: 0 },
    POS: { gmv: 0, orderCount: 0 },
  };
  for (const row of bySourceRows) {
    const key = row.source as OrderSource;
    bySource[key] = {
      gmv: asMoney(row._sum.total),
      orderCount: row._count._all,
    };
  }

  if (allCreatedCount === 0) {
    return {
      empty: true,
      range: params.range,
      timezone: DASHBOARD_TZ,
      from: start.toISOString(),
      to: end.toISOString(),
      kpis: null,
    };
  }

  return {
    empty: false,
    range: params.range,
    timezone: DASHBOARD_TZ,
    from: start.toISOString(),
    to: end.toISOString(),
    kpis: {
      gmv: asMoney(notCancelled._sum.total),
      orderCount: notCancelled._count,
      activeProviders,
      cancellationRate: Number(cancellationRate.toFixed(4)),
      bySource,
    },
  };
}
