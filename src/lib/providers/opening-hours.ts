const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const WEEKDAY_TO_DAY: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export type OpeningHourDay = {
  day: number;
  open: string | null;
  close: string | null;
  closed: boolean;
};

export function parseHhMm(value: string): number | null {
  if (!HHMM.test(value)) return null;
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

export function isHoursPublished(hours: OpeningHourDay[] | null | undefined): boolean {
  return Array.isArray(hours) && hours.length > 0;
}

export function getMonterreyClock(now: Date = new Date()): { day: number; minutes: number } {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Monterrey",
    weekday: "short",
  }).format(now);
  const clock = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Monterrey",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
  const day = WEEKDAY_TO_DAY[weekday] ?? 0;
  const minutes = parseHhMm(clock) ?? 0;
  return { day, minutes };
}

export function computeIsOpenNow(
  hours: OpeningHourDay[] | null | undefined,
  now: Date = new Date()
): boolean | null {
  if (!isHoursPublished(hours)) return null;
  const { day, minutes } = getMonterreyClock(now);
  const slot = hours!.find((h) => h.day === day);
  if (!slot || slot.closed) return false;
  if (!slot.open || !slot.close) return false;
  const open = parseHhMm(slot.open);
  const close = parseHhMm(slot.close);
  if (open === null || close === null) return false;
  return minutes >= open && minutes < close;
}

export function normalizeOpeningHours(
  value: unknown
): OpeningHourDay[] | null {
  if (value === null || value === undefined) return null;
  if (!Array.isArray(value) || value.length === 0) return null;
  return value as OpeningHourDay[];
}
