export const DASHBOARD_TZ = "America/Monterrey";

/** Monterrey is UTC-6 year-round (Mexico abolished DST in 2022). */
const MONTERREY_UTC_OFFSET_HOURS = 6;

export function ymdInTimeZone(
  date: Date,
  timeZone: string = DASHBOARD_TZ
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function addCalendarDays(ymd: string, days: number): string {
  const [year, month, day] = ymd.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return utc.toISOString().slice(0, 10);
}

/** UTC instant of local midnight for a YYYY-MM-DD in America/Monterrey. */
export function monterreyDayStartUtc(ymd: string): Date {
  return new Date(`${ymd}T${String(MONTERREY_UTC_OFFSET_HOURS).padStart(2, "0")}:00:00.000Z`);
}

export function monterreyDayRangeUtc(ymd: string): { start: Date; end: Date } {
  return {
    start: monterreyDayStartUtc(ymd),
    end: monterreyDayStartUtc(addCalendarDays(ymd, 1)),
  };
}

export function rollingWindowUtc(
  todayYmd: string,
  days: number
): { start: Date; end: Date } {
  const startYmd = addCalendarDays(todayYmd, -(days - 1));
  return {
    start: monterreyDayStartUtc(startYmd),
    end: monterreyDayStartUtc(addCalendarDays(todayYmd, 1)),
  };
}
