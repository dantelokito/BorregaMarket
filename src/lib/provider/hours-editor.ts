import type { OpeningHourDay } from "@/lib/api/types";
import { WEEK_ORDER } from "@/lib/providers/hours-format";

function hhMmToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

export function defaultHoursDraft(hours: OpeningHourDay[] | null | undefined): OpeningHourDay[] {
  return WEEK_ORDER.map((day) => {
    const slot = hours?.find((h) => h.day === day);
    if (slot) {
      return {
        day,
        open: slot.open,
        close: slot.close,
        closed: slot.closed || !slot.open || !slot.close,
      };
    }
    return { day, open: null, close: null, closed: true };
  });
}

export function hoursRowError(slot: OpeningHourDay): string {
  if (slot.closed) return "";
  if (!slot.open || !slot.close) return "Día abierto requiere apertura y cierre";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.open) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.close)) {
    return "Usa HH:mm (24h)";
  }
  if (hhMmToMinutes(slot.open) >= hhMmToMinutes(slot.close)) {
    return "La apertura debe ser antes del cierre";
  }
  return "";
}

export function hoursDraftErrors(days: OpeningHourDay[]): Record<number, string> {
  const next: Record<number, string> = {};
  for (const slot of days) {
    const err = hoursRowError(slot);
    if (err) next[slot.day] = err;
  }
  return next;
}

export function toOpeningHoursPayload(days: OpeningHourDay[]): OpeningHourDay[] {
  return days.map((slot) =>
    slot.closed
      ? { day: slot.day, open: null, close: null, closed: true }
      : { day: slot.day, open: slot.open, close: slot.close, closed: false }
  );
}
