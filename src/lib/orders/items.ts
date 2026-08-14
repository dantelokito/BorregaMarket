import { Prisma, UnitOfMeasure } from "@prisma/client";
import { toQuantity } from "@/lib/money";

export interface MarketplaceLineInput {
  providerProductId: string;
  quantity: string;
  unitOfMeasure: UnitOfMeasure;
}

export interface ConsolidatedLine {
  providerProductId: string;
  quantity: Prisma.Decimal;
  unitOfMeasure: UnitOfMeasure;
}

export function consolidateMarketplaceItems(
  items: MarketplaceLineInput[]
): ConsolidatedLine[] {
  const map = new Map<string, ConsolidatedLine>();
  for (const item of items) {
    const key = `${item.providerProductId}:${item.unitOfMeasure}`;
    const qty = toQuantity(item.quantity);
    const existing = map.get(key);
    if (existing) {
      existing.quantity = toQuantity(existing.quantity.plus(qty));
    } else {
      map.set(key, {
        providerProductId: item.providerProductId,
        quantity: qty,
        unitOfMeasure: item.unitOfMeasure,
      });
    }
  }
  return [...map.values()];
}

export function hasPosLineXor(item: {
  providerProductId?: string | null;
  customItem?: unknown;
}): boolean {
  const hasCatalog = Boolean(item.providerProductId);
  const hasCustom = item.customItem != null;
  return hasCatalog !== hasCustom;
}
