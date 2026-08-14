import {
  OrderSource,
  OrderStatus,
  Prisma,
} from "@prisma/client";
import prisma from "@/lib/prisma";
import { formatMoney, formatQuantity, toDecimal } from "@/lib/money";
import {
  addCalendarDays,
  DASHBOARD_TZ,
  rollingWindowUtc,
  ymdInTimeZone,
} from "@/lib/timezone";
import { resolveProviderByUserId } from "@/lib/services/order.service";

function emptyKpi() {
  return { salesTotal: formatMoney(0), orderCount: 0 };
}

export async function getProviderDashboard(params: {
  userId: string;
  now?: Date;
}) {
  const provider = await resolveProviderByUserId(params.userId);
  const now = params.now ?? new Date();
  const todayYmd = ymdInTimeZone(now, DASHBOARD_TZ);
  const d1 = rollingWindowUtc(todayYmd, 1);
  const d7 = rollingWindowUtc(todayYmd, 7);
  const d30 = rollingWindowUtc(todayYmd, 30);

  const notCancelled: Prisma.OrderWhereInput = {
    providerId: provider.id,
    status: { not: OrderStatus.CANCELLED },
  };

  const [
    kpi1,
    kpi7,
    kpi30,
    bySourceRows,
    statusTodayRows,
    seriesRows,
    topRows,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: { ...notCancelled, createdAt: { gte: d1.start, lt: d1.end } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.order.aggregate({
      where: { ...notCancelled, createdAt: { gte: d7.start, lt: d7.end } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.order.aggregate({
      where: { ...notCancelled, createdAt: { gte: d30.start, lt: d30.end } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.order.groupBy({
      by: ["source"],
      where: { ...notCancelled, createdAt: { gte: d30.start, lt: d30.end } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.order.groupBy({
      by: ["status"],
      where: {
        providerId: provider.id,
        createdAt: { gte: d1.start, lt: d1.end },
      },
      _count: true,
    }),
    prisma.$queryRaw<
      Array<{ date: string; sales_total: Prisma.Decimal; order_count: bigint }>
    >`
      SELECT
        (created_at AT TIME ZONE ${DASHBOARD_TZ})::date::text AS date,
        COALESCE(SUM(total), 0) AS sales_total,
        COUNT(*)::bigint AS order_count
      FROM orders
      WHERE provider_id = ${provider.id}
        AND status <> 'CANCELLED'::"OrderStatus"
        AND created_at >= ${d7.start}
        AND created_at < ${d7.end}
      GROUP BY 1
      ORDER BY 1
    `,
    prisma.$queryRaw<
      Array<{
        provider_product_id: string | null;
        name: string;
        sales_total: Prisma.Decimal;
        quantity_sum: Prisma.Decimal;
      }>
    >`
      SELECT
        oi.provider_product_id,
        CASE
          WHEN oi.provider_product_id IS NULL THEN 'Venta rápida'
          ELSE MAX(oi.item_name)
        END AS name,
        COALESCE(SUM(oi.subtotal), 0) AS sales_total,
        COALESCE(SUM(oi.quantity), 0) AS quantity_sum
      FROM order_items oi
      INNER JOIN orders o ON o.id = oi.order_id
      WHERE o.provider_id = ${provider.id}
        AND o.status <> 'CANCELLED'::"OrderStatus"
        AND o.created_at >= ${d30.start}
        AND o.created_at < ${d30.end}
      GROUP BY oi.provider_product_id
      ORDER BY SUM(oi.subtotal) DESC
      LIMIT 5
    `,
  ]);

  const sourceMap = new Map(
    bySourceRows.map((row) => [
      row.source,
      {
        salesTotal: formatMoney(row._sum.total ?? 0),
        orderCount: row._count,
      },
    ])
  );

  const statusToday: Record<OrderStatus, number> = {
    PENDING: 0,
    CONFIRMED: 0,
    IN_TRANSIT: 0,
    DELIVERED: 0,
    CANCELLED: 0,
  };
  for (const row of statusTodayRows) {
    statusToday[row.status] = row._count;
  }

  const seriesByDate = new Map(
    seriesRows.map((row) => [
      row.date,
      {
        salesTotal: formatMoney(row.sales_total),
        orderCount: Number(row.order_count),
      },
    ])
  );
  const series7d = Array.from({ length: 7 }, (_, index) => {
    const date = addCalendarDays(todayYmd, index - 6);
    const point = seriesByDate.get(date);
    return {
      date,
      salesTotal: point?.salesTotal ?? formatMoney(0),
      orderCount: point?.orderCount ?? 0,
    };
  });

  const kpis = {
    d1: {
      salesTotal: formatMoney(kpi1._sum.total ?? 0),
      orderCount: kpi1._count,
    },
    d7: {
      salesTotal: formatMoney(kpi7._sum.total ?? 0),
      orderCount: kpi7._count,
    },
    d30: {
      salesTotal: formatMoney(kpi30._sum.total ?? 0),
      orderCount: kpi30._count,
    },
    bySource: {
      marketplace: sourceMap.get(OrderSource.MARKETPLACE) ?? emptyKpi(),
      pos: sourceMap.get(OrderSource.POS) ?? emptyKpi(),
    },
  };

  return {
    kpis,
    statusToday,
    series7d,
    topProducts: topRows.map((row) => ({
      providerProductId: row.provider_product_id,
      name: row.name,
      salesTotal: formatMoney(row.sales_total),
      quantitySum: formatQuantity(toDecimal(row.quantity_sum)),
    })),
    empty: kpis.d30.orderCount === 0,
  };
}
