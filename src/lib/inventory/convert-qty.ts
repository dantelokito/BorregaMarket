import { Prisma, ProductUnit, UnitOfMeasure } from "@prisma/client";
import { toDecimal, type DecimalValue } from "@/lib/money";

/** POS/Encargar UoM → unidad de catálogo. Redondeo Decimal(12,3) HALF_EVEN (ADR-036). */
export function convertQtyToCatalog(
  productUnit: ProductUnit,
  posUom: UnitOfMeasure,
  quantity: DecimalValue
): Prisma.Decimal {
  const q = toDecimal(quantity);
  let converted = q;

  if (productUnit === ProductUnit.KG && posUom === UnitOfMeasure.KG) {
    converted = q;
  } else if (productUnit === ProductUnit.KG && posUom === UnitOfMeasure.GR) {
    converted = q.div(1000);
  } else if (productUnit === ProductUnit.GRAMO && posUom === UnitOfMeasure.GR) {
    converted = q;
  } else if (productUnit === ProductUnit.GRAMO && posUom === UnitOfMeasure.KG) {
    converted = q.mul(1000);
  } else if (
    (productUnit === ProductUnit.PIEZA ||
      productUnit === ProductUnit.MANOJO ||
      productUnit === ProductUnit.CAJA ||
      productUnit === ProductUnit.LITRO) &&
    posUom === UnitOfMeasure.PZA
  ) {
    converted = q;
  }

  return converted.toDecimalPlaces(3, Prisma.Decimal.ROUND_HALF_EVEN);
}

export function formatOnHand(value: DecimalValue): string {
  return toDecimal(value).toDecimalPlaces(3, Prisma.Decimal.ROUND_HALF_EVEN).toFixed(3);
}
