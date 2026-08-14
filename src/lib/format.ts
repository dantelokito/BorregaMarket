/** UI helpers. API Decimal strings live in `@/lib/money`. */

export function formatCurrency(value: number | string): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "$0.00";
  return n.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatQty(value: number | string): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "0";
  const rounded = Math.round(n * 1000) / 1000;
  if (Number.isInteger(rounded)) return String(rounded);
  return String(rounded);
}

export function qtyToApiString(value: number): string {
  return (Math.round(value * 1000) / 1000).toFixed(3);
}

export function parseDecimalInput(raw: string): number | null {
  const normalized = raw.replace(",", ".").trim();
  if (normalized === "" || normalized === ".") return null;
  if (!/^\d+(\.\d{0,3})?$/.test(normalized)) return null;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 1000) / 1000;
}

export function lineAmount(quantity: number, unitPrice: number): number {
  return Math.round(quantity * unitPrice * 100 + Number.EPSILON) / 100;
}
