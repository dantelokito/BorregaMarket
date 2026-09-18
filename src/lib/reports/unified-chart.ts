export interface ChartPoint {
  key: string;
  label: string;
  value: number;
  hint?: string;
}

export function chartMax(points: ChartPoint[]): number {
  if (points.length === 0) return 0;
  return Math.max(...points.map((p) => p.value), 0);
}

export function barHeight(value: number, max: number, scale = 140): number {
  if (max <= 0) return 0;
  return (value / max) * scale;
}

export function seriesToTrendPoints(
  series: { bucket?: string; date?: string; gmv?: string; salesTotal?: string; orderCount: number }[]
): ChartPoint[] {
  return series.map((s) => {
    const key = s.bucket ?? s.date ?? "";
    const raw = s.gmv ?? s.salesTotal ?? "0";
    return {
      key,
      label: key.length > 7 ? key.slice(5) : key,
      value: Number(raw) || 0,
      hint: `${s.orderCount} ${s.orderCount === 1 ? "orden" : "órdenes"}`,
    };
  });
}

type SourceSlice = {
  gmv?: string;
  salesTotal?: string;
  orderCount?: number;
};

export function sourceToMixPoints(bySource: {
  MARKETPLACE?: SourceSlice;
  POS?: SourceSlice;
  marketplace?: SourceSlice;
  pos?: SourceSlice;
}): ChartPoint[] {
  const market = bySource.MARKETPLACE ?? bySource.marketplace;
  const pos = bySource.POS ?? bySource.pos;
  const marketValue = Number(market?.gmv ?? market?.salesTotal ?? 0) || 0;
  const posValue = Number(pos?.gmv ?? pos?.salesTotal ?? 0) || 0;
  return [
    {
      key: "MARKETPLACE",
      label: "Encargar",
      value: marketValue,
      hint: `${market?.orderCount ?? 0} ${(market?.orderCount ?? 0) === 1 ? "orden" : "órdenes"}`,
    },
    {
      key: "POS",
      label: "Mostrador",
      value: posValue,
      hint: `${pos?.orderCount ?? 0} ${(pos?.orderCount ?? 0) === 1 ? "orden" : "órdenes"}`,
    },
  ];
}

export function productsToTopPoints(
  products: { providerProductId?: string | null; name: string; salesTotal: string }[]
): ChartPoint[] {
  return products.slice(0, 5).map((p, i) => ({
    key: `${p.providerProductId ?? "qs"}-${i}`,
    label: p.name,
    value: Number(p.salesTotal) || 0,
  }));
}
