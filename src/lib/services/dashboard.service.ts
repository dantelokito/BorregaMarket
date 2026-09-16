import {
  OrderSource,
  OrderStatus,
  Prisma,
} from "@prisma/client";
import prisma from "@/lib/prisma";
import { formatMoney, formatQuantity, toDecimal } from "@/lib/money";
import type { ProviderReport } from "@/lib/api/types";
import {
  addCalendarDays,
  DASHBOARD_TZ,
  monthsInYear,
  monterreyDayStartUtc,
  reportWindowUtc,
  rollingWindowUtc,
  type ReportGrain,
  ymdInTimeZone,
  ymdsInMonth,
} from "@/lib/timezone";
import { resolveProviderByUserId } from "@/lib/services/order.service";
import { listOwnedProviders } from "@/lib/providers/owned-provider";
import { OrderForbiddenError } from "@/lib/orders/errors";

export class GlobalReportsNotAvailableError extends Error {
  readonly code = "GLOBAL_REPORTS_NOT_AVAILABLE";
  constructor(
    message = "El reporte global solo está disponible con más de una sucursal"
  ) {
    super(message);
    this.name = "GlobalReportsNotAvailableError";
  }
}

function emptyKpi() {
  return { salesTotal: formatMoney(0), orderCount: 0 };
}

function emptySourceKpi() {
  return { gmv: formatMoney(0), orderCount: 0 };
}

function topProductsQuery(providerId: string, from: Date, to: Date) {
  return prisma.$queryRaw<
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
    LEFT JOIN provider_products pp ON pp.id = oi.provider_product_id
    WHERE o.provider_id = ${providerId}
      AND o.status <> 'CANCELLED'::"OrderStatus"
      AND o.created_at >= ${from}
      AND o.created_at < ${to}
    GROUP BY oi.provider_product_id
    ORDER BY SUM(oi.subtotal) DESC
    LIMIT 5
  `;
}

export async function getProviderDashboard(params: {
  userId: string;
  providerId?: string;
  now?: Date;
}) {
  const provider = await resolveProviderByUserId(params.userId, params.providerId);
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
    topProductsQuery(provider.id, d30.start, d30.end),
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

function seriesQuery(grain: "month" | "year", providerId: string, from: Date, to: Date) {
  if (grain === "year") {
    return prisma.$queryRaw<
      Array<{ bucket: string; gmv: Prisma.Decimal; order_count: bigint }>
    >`
      SELECT
        to_char((created_at AT TIME ZONE ${DASHBOARD_TZ}), 'YYYY-MM') AS bucket,
        COALESCE(SUM(total), 0) AS gmv,
        COUNT(*)::bigint AS order_count
      FROM orders
      WHERE provider_id = ${providerId}
        AND status <> 'CANCELLED'::"OrderStatus"
        AND created_at >= ${from}
        AND created_at < ${to}
      GROUP BY 1
      ORDER BY 1
    `;
  }

  return prisma.$queryRaw<
    Array<{ bucket: string; gmv: Prisma.Decimal; order_count: bigint }>
  >`
    SELECT
      (created_at AT TIME ZONE ${DASHBOARD_TZ})::date::text AS bucket,
      COALESCE(SUM(total), 0) AS gmv,
      COUNT(*)::bigint AS order_count
    FROM orders
    WHERE provider_id = ${providerId}
      AND status <> 'CANCELLED'::"OrderStatus"
      AND created_at >= ${from}
      AND created_at < ${to}
    GROUP BY 1
    ORDER BY 1
  `;
}

export async function getProviderReport(params: {
  userId: string;
  providerId?: string;
  grain: ReportGrain;
  date: string;
  now?: Date;
}): Promise<ProviderReport> {
  const provider = await resolveProviderByUserId(params.userId, params.providerId);
  const now = params.now ?? new Date();
  const { from, to } = reportWindowUtc(params.grain, params.date);

  const notCancelled: Prisma.OrderWhereInput = {
    providerId: provider.id,
    status: { not: OrderStatus.CANCELLED },
    createdAt: { gte: from, lt: to },
  };

  const [kpi, bySourceRows, seriesRows, topRows] = await Promise.all([
    prisma.order.aggregate({
      where: notCancelled,
      _sum: { total: true },
      _count: true,
    }),
    prisma.order.groupBy({
      by: ["source"],
      where: notCancelled,
      _sum: { total: true },
      _count: true,
    }),
    params.grain === "day"
      ? Promise.resolve(
          [] as Array<{ bucket: string; gmv: Prisma.Decimal; order_count: bigint }>
        )
      : seriesQuery(params.grain, provider.id, from, to),
    topProductsQuery(provider.id, from, to),
  ]);

  const sourceMap = new Map(
    bySourceRows.map((row) => [
      row.source,
      {
        gmv: formatMoney(row._sum.total ?? 0),
        orderCount: row._count,
      },
    ])
  );

  const orderCount = kpi._count;
  const gmv = formatMoney(kpi._sum.total ?? 0);
  const avgTicket =
    orderCount === 0
      ? formatMoney(0)
      : formatMoney(toDecimal(kpi._sum.total ?? 0).div(orderCount));

  const seriesByBucket = new Map(
    seriesRows.map((row) => [
      row.bucket,
      {
        gmv: formatMoney(row.gmv),
        orderCount: Number(row.order_count),
      },
    ])
  );

  let series: ProviderReport["series"] = [];
  if (params.grain === "month") {
    series = ymdsInMonth(params.date).map((bucket) => {
      const point = seriesByBucket.get(bucket);
      return {
        bucket,
        gmv: point?.gmv ?? formatMoney(0),
        orderCount: point?.orderCount ?? 0,
      };
    });
  } else if (params.grain === "year") {
    series = monthsInYear(params.date).map((bucket) => {
      const point = seriesByBucket.get(bucket);
      return {
        bucket,
        gmv: point?.gmv ?? formatMoney(0),
        orderCount: point?.orderCount ?? 0,
      };
    });
  }

  return {
    empty: orderCount === 0,
    timezone: DASHBOARD_TZ,
    generatedAt: now.toISOString(),
    provider: {
      id: provider.id,
      businessName: provider.businessName,
    },
    period: {
      grain: params.grain,
      date: params.date,
      from: from.toISOString(),
      to: to.toISOString(),
    },
    kpis: {
      gmv,
      avgTicket,
      orderCount,
      bySource: {
        MARKETPLACE: sourceMap.get(OrderSource.MARKETPLACE) ?? emptySourceKpi(),
        POS: sourceMap.get(OrderSource.POS) ?? emptySourceKpi(),
      },
    },
    series,
    topProducts: topRows.map((row) => ({
      providerProductId: row.provider_product_id,
      name: row.name,
      salesTotal: formatMoney(row.sales_total),
      quantitySum: formatQuantity(toDecimal(row.quantity_sum)),
    })),
  };
}

function ymdsInInclusiveRange(from: string, to: string): string[] {
  const days: string[] = [];
  let cursor = from;
  while (cursor <= to) {
    days.push(cursor);
    cursor = addCalendarDays(cursor, 1);
  }
  return days;
}

export async function getProviderReportRange(params: {
  userId: string;
  providerId?: string;
  from: string;
  to: string;
  productIds: string[];
  now?: Date;
}): Promise<ProviderReport> {
  const provider = await resolveProviderByUserId(params.userId, params.providerId);
  const now = params.now ?? new Date();
  const fromUtc = monterreyDayStartUtc(params.from);
  const toExclusiveUtc = monterreyDayStartUtc(addCalendarDays(params.to, 1));

  const includeQuickSale = params.productIds.includes("quickSale");
  const requestedIds = [...new Set(params.productIds.filter((id) => id !== "quickSale"))];
  const filterByIds = params.productIds.length > 0;

  if (requestedIds.length > 0) {
    const owned = await prisma.providerProduct.findMany({
      where: { providerId: provider.id, id: { in: requestedIds } },
      select: { id: true },
    });
    if (owned.length !== requestedIds.length) {
      throw new OrderForbiddenError();
    }
  }

  const orders = await prisma.order.findMany({
    where: {
      providerId: provider.id,
      status: { not: OrderStatus.CANCELLED },
      createdAt: { gte: fromUtc, lt: toExclusiveUtc },
    },
    include: { items: true },
  });

  type Agg = {
    name: string;
    quantity: ReturnType<typeof toDecimal>;
    gmv: ReturnType<typeof toDecimal>;
    marketplaceGmv: ReturnType<typeof toDecimal>;
    marketplaceQty: ReturnType<typeof toDecimal>;
    posGmv: ReturnType<typeof toDecimal>;
    posQty: ReturnType<typeof toDecimal>;
  };

  const productMap = new Map<string, Agg>();
  const sourceGmv = {
    MARKETPLACE: toDecimal(0),
    POS: toDecimal(0),
  };
  const sourceOrders = { MARKETPLACE: new Set<string>(), POS: new Set<string>() };
  const orderIds = new Set<string>();
  const seriesMap = new Map<string, { gmv: ReturnType<typeof toDecimal>; orders: Set<string> }>();
  let gmvTotal = toDecimal(0);

  const idKey = (providerProductId: string | null) =>
    providerProductId ?? "quickSale";

  for (const order of orders) {
    const included = order.items.filter((item) => {
      if (!filterByIds) return true;
      if (item.providerProductId == null) return includeQuickSale;
      return requestedIds.includes(item.providerProductId);
    });
    if (included.length === 0) continue;

    orderIds.add(order.id);
    sourceOrders[order.source].add(order.id);
    const bucket = ymdInTimeZone(order.createdAt, DASHBOARD_TZ);
    if (!seriesMap.has(bucket)) {
      seriesMap.set(bucket, { gmv: toDecimal(0), orders: new Set() });
    }
    const seriesPoint = seriesMap.get(bucket)!;
    seriesPoint.orders.add(order.id);

    for (const item of included) {
      const sub = toDecimal(item.subtotal);
      const qty = toDecimal(item.quantity);
      gmvTotal = gmvTotal.add(sub);
      sourceGmv[order.source] = sourceGmv[order.source].add(sub);
      seriesPoint.gmv = seriesPoint.gmv.add(sub);

      const key = idKey(item.providerProductId);
      const current = productMap.get(key) ?? {
        name: item.providerProductId == null ? "Venta rápida" : item.itemName,
        quantity: toDecimal(0),
        gmv: toDecimal(0),
        marketplaceGmv: toDecimal(0),
        marketplaceQty: toDecimal(0),
        posGmv: toDecimal(0),
        posQty: toDecimal(0),
      };
      current.quantity = current.quantity.add(qty);
      current.gmv = current.gmv.add(sub);
      if (order.source === OrderSource.MARKETPLACE) {
        current.marketplaceGmv = current.marketplaceGmv.add(sub);
        current.marketplaceQty = current.marketplaceQty.add(qty);
      } else {
        current.posGmv = current.posGmv.add(sub);
        current.posQty = current.posQty.add(qty);
      }
      productMap.set(key, current);
    }
  }

  const orderCount = orderIds.size;
  const avgTicket =
    orderCount === 0 ? formatMoney(0) : formatMoney(gmvTotal.div(orderCount));

  const series = ymdsInInclusiveRange(params.from, params.to).map((bucket) => {
    const point = seriesMap.get(bucket);
    return {
      bucket,
      gmv: formatMoney(point?.gmv ?? 0),
      orderCount: point?.orders.size ?? 0,
    };
  });

  const products = [...productMap.entries()].map(([key, row]) => ({
    providerProductId: key === "quickSale" ? null : key,
    name: row.name,
    quantitySum: formatQuantity(row.quantity),
    salesTotal: formatMoney(row.gmv),
    bySource: {
      MARKETPLACE: {
        gmv: formatMoney(row.marketplaceGmv),
        quantitySum: formatQuantity(row.marketplaceQty),
      },
      POS: {
        gmv: formatMoney(row.posGmv),
        quantitySum: formatQuantity(row.posQty),
      },
    },
  }));

  return {
    empty: orderCount === 0,
    timezone: DASHBOARD_TZ,
    generatedAt: now.toISOString(),
    provider: {
      id: provider.id,
      businessName: provider.businessName,
    },
    period: {
      mode: "range",
      from: params.from,
      to: params.to,
      fromUtc: fromUtc.toISOString(),
      toUtc: toExclusiveUtc.toISOString(),
    },
    kpis: {
      gmv: formatMoney(gmvTotal),
      avgTicket,
      orderCount,
      bySource: {
        MARKETPLACE: {
          gmv: formatMoney(sourceGmv.MARKETPLACE),
          orderCount: sourceOrders.MARKETPLACE.size,
        },
        POS: {
          gmv: formatMoney(sourceGmv.POS),
          orderCount: sourceOrders.POS.size,
        },
      },
    },
    series,
    products,
  };
}

export async function getGlobalProviderReport(params: {
  userId: string;
  from: string;
  to: string;
  productIds: string[];
  now?: Date;
}) {
  const providers = await listOwnedProviders(params.userId);
  if (providers.length <= 1) {
    throw new GlobalReportsNotAvailableError();
  }

  const now = params.now ?? new Date();
  const fromUtc = monterreyDayStartUtc(params.from);
  const toExclusiveUtc = monterreyDayStartUtc(addCalendarDays(params.to, 1));
  const providerIds = providers.map((p) => p.id);
  const includeQuickSale = params.productIds.includes("quickSale");
  const requestedIds = [...new Set(params.productIds.filter((id) => id !== "quickSale"))];
  const filterByIds = params.productIds.length > 0;

  if (requestedIds.length > 0) {
    const owned = await prisma.providerProduct.findMany({
      where: { providerId: { in: providerIds }, id: { in: requestedIds } },
      select: { id: true, providerId: true },
    });
    if (owned.length !== requestedIds.length) {
      throw new OrderForbiddenError();
    }
  }

  const orders = await prisma.order.findMany({
    where: {
      providerId: { in: providerIds },
      status: { not: OrderStatus.CANCELLED },
      createdAt: { gte: fromUtc, lt: toExclusiveUtc },
    },
    include: { items: true },
  });

  type Agg = {
    providerId: string;
    name: string;
    quantity: ReturnType<typeof toDecimal>;
    gmv: ReturnType<typeof toDecimal>;
    marketplaceGmv: ReturnType<typeof toDecimal>;
    marketplaceQty: ReturnType<typeof toDecimal>;
    posGmv: ReturnType<typeof toDecimal>;
    posQty: ReturnType<typeof toDecimal>;
  };

  const productMap = new Map<string, Agg>();
  const sourceGmv = { MARKETPLACE: toDecimal(0), POS: toDecimal(0) };
  const sourceOrders = { MARKETPLACE: new Set<string>(), POS: new Set<string>() };
  const orderIds = new Set<string>();
  const seriesMap = new Map<string, { gmv: ReturnType<typeof toDecimal>; orders: Set<string> }>();
  const byProviderGmv = new Map<string, { gmv: ReturnType<typeof toDecimal>; orders: Set<string> }>();
  for (const p of providers) {
    byProviderGmv.set(p.id, { gmv: toDecimal(0), orders: new Set() });
  }
  let gmvTotal = toDecimal(0);

  for (const order of orders) {
    const included = order.items.filter((item) => {
      if (!filterByIds) return true;
      if (item.providerProductId == null) return includeQuickSale;
      return requestedIds.includes(item.providerProductId);
    });
    if (filterByIds && included.length === 0) continue;

    const orderGmv = filterByIds
      ? included.reduce((acc, item) => acc.add(toDecimal(item.subtotal)), toDecimal(0))
      : toDecimal(order.total);

    if (!filterByIds && included.length === 0 && Number(order.total) === 0) {
      continue;
    }

    orderIds.add(order.id);
    sourceOrders[order.source].add(order.id);
    const bucket = ymdInTimeZone(order.createdAt, DASHBOARD_TZ);
    if (!seriesMap.has(bucket)) {
      seriesMap.set(bucket, { gmv: toDecimal(0), orders: new Set() });
    }
    const seriesPoint = seriesMap.get(bucket)!;
    seriesPoint.orders.add(order.id);
    seriesPoint.gmv = seriesPoint.gmv.add(orderGmv);
    gmvTotal = gmvTotal.add(orderGmv);
    sourceGmv[order.source] = sourceGmv[order.source].add(orderGmv);
    const branch = byProviderGmv.get(order.providerId);
    if (branch) {
      branch.gmv = branch.gmv.add(orderGmv);
      branch.orders.add(order.id);
    }

    const itemsForProducts = filterByIds ? included : order.items;
    for (const item of itemsForProducts) {
      const sub = toDecimal(item.subtotal);
      const qty = toDecimal(item.quantity);
      const key = `${order.providerId}:${item.providerProductId ?? "quickSale"}`;
      const current = productMap.get(key) ?? {
        providerId: order.providerId,
        name: item.providerProductId == null ? "Venta rápida" : item.itemName,
        quantity: toDecimal(0),
        gmv: toDecimal(0),
        marketplaceGmv: toDecimal(0),
        marketplaceQty: toDecimal(0),
        posGmv: toDecimal(0),
        posQty: toDecimal(0),
      };
      current.quantity = current.quantity.add(qty);
      current.gmv = current.gmv.add(sub);
      if (order.source === OrderSource.MARKETPLACE) {
        current.marketplaceGmv = current.marketplaceGmv.add(sub);
        current.marketplaceQty = current.marketplaceQty.add(qty);
      } else {
        current.posGmv = current.posGmv.add(sub);
        current.posQty = current.posQty.add(qty);
      }
      productMap.set(key, current);
    }
  }

  const orderCount = orderIds.size;
  const avgTicket =
    orderCount === 0 ? formatMoney(0) : formatMoney(gmvTotal.div(orderCount));

  const series = ymdsInInclusiveRange(params.from, params.to).map((bucket) => {
    const point = seriesMap.get(bucket);
    return {
      bucket,
      gmv: formatMoney(point?.gmv ?? 0),
      orderCount: point?.orders.size ?? 0,
    };
  });

  const nameById = new Map(providers.map((p) => [p.id, p.businessName]));
  const byProvider = providers.map((p) => {
    const row = byProviderGmv.get(p.id)!;
    const count = row.orders.size;
    return {
      providerId: p.id,
      businessName: p.businessName,
      gmv: formatMoney(row.gmv),
      orderCount: count,
      avgTicket: count === 0 ? formatMoney(0) : formatMoney(row.gmv.div(count)),
    };
  });

  const products = [...productMap.entries()].map(([key, row]) => ({
    providerProductId: key.endsWith(":quickSale") ? null : key.split(":")[1],
    providerId: row.providerId,
    businessName: nameById.get(row.providerId) ?? "",
    name: row.name,
    quantitySum: formatQuantity(row.quantity),
    salesTotal: formatMoney(row.gmv),
    bySource: {
      MARKETPLACE: {
        gmv: formatMoney(row.marketplaceGmv),
        quantitySum: formatQuantity(row.marketplaceQty),
      },
      POS: {
        gmv: formatMoney(row.posGmv),
        quantitySum: formatQuantity(row.posQty),
      },
    },
  }));

  return {
    empty: orderCount === 0,
    timezone: DASHBOARD_TZ,
    generatedAt: now.toISOString(),
    scope: "allOwnedProviders" as const,
    providerCount: providers.length,
    period: {
      mode: "range" as const,
      from: params.from,
      to: params.to,
      fromUtc: fromUtc.toISOString(),
      toUtc: toExclusiveUtc.toISOString(),
    },
    kpis: {
      gmv: formatMoney(gmvTotal),
      avgTicket,
      orderCount,
      bySource: {
        MARKETPLACE: {
          gmv: formatMoney(sourceGmv.MARKETPLACE),
          orderCount: sourceOrders.MARKETPLACE.size,
        },
        POS: {
          gmv: formatMoney(sourceGmv.POS),
          orderCount: sourceOrders.POS.size,
        },
      },
    },
    byProvider,
    series,
    products,
  };
}
