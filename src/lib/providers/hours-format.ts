import type { OpeningHourDay } from "@/lib/api/types";

/** Week starts on Monday for display; `day` follows JS getDay (0 = domingo). */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export const DAY_LABELS: Record<number, string> = {
  0: "Domingo",
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
};

export interface HoursRow {
  day: number;
  label: string;
  open: string;
  close: string;
  closed: boolean;
  /** Stacked mobile layout: "08:00 – 18:00" or "Cerrado". */
  rangeLabel: string;
}

export function buildHoursRows(hours: OpeningHourDay[] | null | undefined): HoursRow[] {
  if (!Array.isArray(hours) || hours.length === 0) return [];

  return WEEK_ORDER.flatMap((day) => {
    const slot = hours.find((h) => h.day === day);
    if (!slot) return [];
    const closed = slot.closed || !slot.open || !slot.close;
    return [
      {
        day,
        label: DAY_LABELS[day] ?? "",
        open: closed ? "Cerrado" : slot.open!,
        close: closed ? "—" : slot.close!,
        closed,
        rangeLabel: closed ? "Cerrado" : `${slot.open} – ${slot.close}`,
      },
    ];
  });
}

/** "verificado a la borrega desde MM/AAAA"; sin fecha (datos viejos) → copy genérico. */
export function formatVerifiedSince(verifiedAt: string | null | undefined): string {
  if (!verifiedAt) return "verificado a la borrega";
  const date = new Date(verifiedAt);
  if (Number.isNaN(date.getTime())) return "verificado a la borrega";
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `verificado a la borrega desde ${month}/${date.getUTCFullYear()}`;
}
