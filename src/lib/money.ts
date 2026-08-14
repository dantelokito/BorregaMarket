import { Prisma } from "@prisma/client";

export const Decimal = Prisma.Decimal;

type DecimalValue = Prisma.Decimal | string | number;

export function toDecimal(value: DecimalValue): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

export function hasMaxDecimals(value: string, max: number): boolean {
  const normalized = value.trim().replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return false;
  const fraction = normalized.split(".")[1];
  return !fraction || fraction.length <= max;
}

export function isPositive(value: DecimalValue): boolean {
  return toDecimal(value).gt(0);
}

export function toQuantity(value: DecimalValue): Prisma.Decimal {
  return toDecimal(value).toDecimalPlaces(3, Prisma.Decimal.ROUND_HALF_UP);
}

export function toMoney(value: DecimalValue): Prisma.Decimal {
  return toDecimal(value).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

/** unitPrice × quantity, ROUND_HALF_UP to 2 decimals */
export function lineSubtotal(unitPrice: DecimalValue, quantity: DecimalValue): Prisma.Decimal {
  return toMoney(toDecimal(unitPrice).times(toDecimal(quantity)));
}

export function sumMoney(values: DecimalValue[]): Prisma.Decimal {
  return values.reduce<Prisma.Decimal>(
    (acc, value) => toMoney(acc.plus(toDecimal(value))),
    new Prisma.Decimal(0)
  );
}

/** API/JSON money string, e.g. "85.50" */
export function formatMoney(value: DecimalValue): string {
  return toMoney(value).toFixed(2);
}

/** API/JSON quantity string, e.g. "2.000" */
export function formatQuantity(value: DecimalValue): string {
  return toQuantity(value).toFixed(3);
}
