import { Prisma, ProductUnit } from "@prisma/client";

/** Vendible público / POS / Encargar (ADR-022 + ADR-038). */
export const sellableProviderProductWhere = {
  isAvailable: true,
  archivedAt: null,
  product: { isActive: true },
} as const;

export function effectiveSaleUnit(
  saleUnit: ProductUnit | null | undefined,
  masterUnit: ProductUnit
): ProductUnit {
  return saleUnit ?? masterUnit;
}

export function formatOfferPrice(value: Prisma.Decimal | string | number): string {
  return new Prisma.Decimal(value).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_EVEN).toFixed(2);
}

export function isOfferSellable(row: {
  isAvailable: boolean;
  archivedAt: Date | null;
  product: { isActive: boolean };
}): boolean {
  return row.isAvailable && row.product.isActive && row.archivedAt === null;
}
