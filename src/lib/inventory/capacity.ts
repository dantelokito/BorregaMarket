export function parseQtyString(raw: string | null | undefined): number {
  if (raw == null || raw === "") return 0;
  const n = Number(String(raw).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function formatFillPercent(fillPercent: number | null | undefined): string | null {
  if (fillPercent == null || !Number.isFinite(fillPercent)) return null;
  const rounded = Math.round(fillPercent * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded}%`;
}

export function capacityBarWidth(fillPercent: number | null | undefined): number {
  if (fillPercent == null || !Number.isFinite(fillPercent)) return 0;
  if (fillPercent <= 0) return 0;
  return Math.min(100, fillPercent);
}

export function isOverCapacity(fillPercent: number | null | undefined): boolean {
  return fillPercent != null && Number.isFinite(fillPercent) && fillPercent > 100;
}

export function fillAriaText(fillPercent: number | null | undefined): string {
  if (fillPercent == null || !Number.isFinite(fillPercent)) {
    return "Sin tope de capacidad";
  }
  const label = formatFillPercent(fillPercent) ?? "0%";
  return `${label.replace("%", "")} por ciento de capacidad`;
}
