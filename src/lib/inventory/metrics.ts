import { Prisma } from "@prisma/client";
import { toDecimal, type DecimalValue } from "@/lib/money";
import { formatOnHand } from "@/lib/inventory/convert-qty";

export type InventoryMetricsInput = {
  onHand: DecimalValue;
  reserved: DecimalValue;
  capacityMax: DecimalValue | null;
  alertThresholdPercent: number;
  alertEnabled: boolean;
};

export type InventoryMetrics = {
  onHand: string;
  reserved: string;
  capacityMax: string | null;
  fillPercent: number | null;
  alertThresholdPercent: number;
  alertEnabled: boolean;
  lowStockAlert: boolean;
};

export function computeInventoryMetrics(input: InventoryMetricsInput): InventoryMetrics {
  const onHand = toDecimal(input.onHand);
  const reserved = toDecimal(input.reserved);
  const capacity =
    input.capacityMax === null || input.capacityMax === undefined
      ? null
      : toDecimal(input.capacityMax);

  let fillPercent: number | null = null;
  if (capacity !== null && capacity.gt(0)) {
    fillPercent = Number(onHand.div(capacity).mul(100).toDecimalPlaces(8));
  }

  let lowStockAlert = false;
  if (input.alertEnabled && fillPercent !== null) {
    lowStockAlert = fillPercent <= input.alertThresholdPercent;
  }

  return {
    onHand: formatOnHand(onHand),
    reserved: formatOnHand(reserved),
    capacityMax: capacity === null ? null : formatOnHand(capacity),
    fillPercent,
    alertThresholdPercent: input.alertThresholdPercent,
    alertEnabled: input.alertEnabled,
    lowStockAlert,
  };
}

export const PUBLIC_INVENTORY_KEYS = [
  "onHand",
  "capacityMax",
  "fillPercent",
  "alertThresholdPercent",
  "alertEnabled",
  "lowStockAlert",
  "reserved",
  "boxContentFactor",
] as const;

export function assertNoPublicInventoryKeys(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") return [];
  const found: string[] = [];
  const visit = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    for (const key of Object.keys(value as object)) {
      if ((PUBLIC_INVENTORY_KEYS as readonly string[]).includes(key)) {
        found.push(key);
      }
      visit((value as Record<string, unknown>)[key]);
    }
  };
  visit(payload);
  return found;
}

export { Prisma };
