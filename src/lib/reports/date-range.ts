import { ymdInTimeZone } from "@/lib/timezone";

export const COPY_FROM_AFTER_TO = "La fecha de inicio no puede ser posterior a la de fin";
export const COPY_OVER_366 = "El rango no puede superar 366 días";
export const COPY_FUTURE = "Elige un periodo que no sea futuro";

export function inclusiveDaySpan(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00.000Z`);
  const end = Date.parse(`${to}T00:00:00.000Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return NaN;
  return Math.round((end - start) / 86_400_000) + 1;
}

export function lastDayOfMonth(yyyyMm: string): string {
  const [year, month] = yyyyMm.split("-").map(Number);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${yyyyMm}-${String(last).padStart(2, "0")}`;
}

export function monthShortcutRange(
  yyyyMm: string,
  today: string
): { from: string; to: string } {
  const from = `${yyyyMm}-01`;
  const monthEnd = lastDayOfMonth(yyyyMm);
  return { from, to: monthEnd > today ? today : monthEnd };
}

export function currentMonthShortcut(now: Date = new Date()): {
  month: string;
  from: string;
  to: string;
} {
  const today = ymdInTimeZone(now);
  const month = today.slice(0, 7);
  return { month, ...monthShortcutRange(month, today) };
}

export function validateDateRange(
  from: string,
  to: string,
  today: string
): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return COPY_FROM_AFTER_TO;
  }
  if (from > to) return COPY_FROM_AFTER_TO;
  const span = inclusiveDaySpan(from, to);
  if (!Number.isFinite(span) || span > 366) return COPY_OVER_366;
  if (from > today || to > today) return COPY_FUTURE;
  return null;
}
