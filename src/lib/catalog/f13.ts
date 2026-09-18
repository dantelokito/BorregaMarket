export const PRODUCT_UNITS = [
  "KG",
  "PIEZA",
  "MANOJO",
  "CAJA",
  "LITRO",
  "GRAMO",
] as const;

export type ProductUnitCode = (typeof PRODUCT_UNITS)[number];

export function effectiveSaleUnit(
  saleUnit: string | null | undefined,
  masterUnit: string | null | undefined
): string {
  return saleUnit || masterUnit || "KG";
}

export function factorRequired(unit: string | null | undefined): boolean {
  return unit === "CAJA";
}

export function onHandIsNonZero(onHand: string | number | null | undefined): boolean {
  if (onHand == null || onHand === "") return false;
  const n = typeof onHand === "number" ? onHand : Number(onHand);
  return Number.isFinite(n) && n !== 0;
}

export function reservedIsPositive(reserved: string | number | null | undefined): boolean {
  if (reserved == null || reserved === "") return false;
  const n = typeof reserved === "number" ? reserved : Number(reserved);
  return Number.isFinite(n) && n > 0;
}

export function unitOrFactorChanged(opts: {
  prevSaleUnit: string | null | undefined;
  nextSaleUnit: string | null | undefined;
  prevFactor: string | null | undefined;
  nextFactor: string | null | undefined;
}): boolean {
  const prevU = opts.prevSaleUnit ?? null;
  const nextU = opts.nextSaleUnit ?? null;
  const prevF = opts.prevFactor ?? null;
  const nextF = opts.nextFactor ?? null;
  return prevU !== nextU || String(prevF ?? "") !== String(nextF ?? "");
}

export function formatMoney2(value: string | number | null | undefined): string {
  if (value == null || value === "") return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatHistoryWhen(iso: string, timeZone = "America/Monterrey"): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("es-MX", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

export function formatPriceHistoryLine(row: {
  previousPrice: string | number | null;
  price: string | number;
  createdAt: string;
}): string {
  const from = row.previousPrice == null ? "—" : `$${formatMoney2(row.previousPrice)}`;
  const to = `$${formatMoney2(row.price)}`;
  return `${formatHistoryWhen(row.createdAt)}  ${from} → ${to}`;
}

export function deleteNotAllowedCopy(status: number): string | null {
  if (status === 405) {
    return "No se puede eliminar el producto. Oculta la oferta o inactiva el SKU.";
  }
  return null;
}

export function staleOfferCopy(message?: string): string {
  return message?.trim() || "El producto ya no está disponible";
}

export function isEncargarActiveError(status: number, details?: { field?: string; message?: string }[]): boolean {
  if (status !== 409) return false;
  return (
    details?.some(
      (d) => d.field === "saleUnit" || String(d.message ?? "").includes("Encargar")
    ) ?? false
  );
}

export function isConfirmDiscardRequired(
  status: number,
  details?: { field?: string; message?: string }[],
  message?: string
): boolean {
  if (status !== 400) return false;
  const blob = `${message ?? ""} ${details?.map((d) => `${d.field} ${d.message}`).join(" ") ?? ""}`;
  return details?.some((d) => d.field === "confirmDiscard") || /confirmDiscard/i.test(blob);
}
