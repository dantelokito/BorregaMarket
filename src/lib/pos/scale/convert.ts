import type { UnitOfMeasure } from "@/lib/api/types";

export function isWeighableUnit(unit: UnitOfMeasure): boolean {
  return unit === "KG" || unit === "GR";
}

export function gramsToQuantity(grams: number, unit: UnitOfMeasure): number | null {
  if (!Number.isFinite(grams) || grams < 0) return null;
  if (unit === "PZA") return null;
  if (unit === "GR") return Math.round(grams * 1000) / 1000;
  return Math.round((grams / 1000) * 1000) / 1000;
}
