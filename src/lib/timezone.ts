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

export type ReportGrain = "day" | "month" | "year";

export function nextMonthYyyyMm(yyyyMm: string): string {
  const [year, month] = yyyyMm.split("-").map(Number);
  if (month === 12) {
    return `${year + 1}-01`;
  }
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export function monterreyMonthRangeUtc(yyyyMm: string): { start: Date; end: Date } {
  return {
    start: monterreyDayStartUtc(`${yyyyMm}-01`),
    end: monterreyDayStartUtc(`${nextMonthYyyyMm(yyyyMm)}-01`),
  };
}

export function monterreyYearRangeUtc(yyyy: string): { start: Date; end: Date } {
  const year = Number(yyyy);
  return {
    start: monterreyDayStartUtc(`${year}-01-01`),
    end: monterreyDayStartUtc(`${year + 1}-01-01`),
  };
}

export function reportWindowUtc(
  grain: ReportGrain,
  date: string
): { from: Date; to: Date } {
  if (grain === "day") {
    const range = monterreyDayRangeUtc(date);
    return { from: range.start, to: range.end };
  }
  if (grain === "month") {
    const range = monterreyMonthRangeUtc(date);
    return { from: range.start, to: range.end };
  }
  const range = monterreyYearRangeUtc(date);
  return { from: range.start, to: range.end };
}

/** True when the calendar period is strictly after today in America/Monterrey. */
export function isReportPeriodInFuture(
  grain: ReportGrain,
  date: string,
  now: Date = new Date()
): boolean {
  const today = ymdInTimeZone(now);
  if (grain === "day") return date > today;
  if (grain === "month") return date > today.slice(0, 7);
  return date > today.slice(0, 4);
}

export function ymdsInMonth(yyyyMm: string): string[] {
  const days: string[] = [];
  let cursor = `${yyyyMm}-01`;
  const endYmd = `${nextMonthYyyyMm(yyyyMm)}-01`;
  while (cursor < endYmd) {
    days.push(cursor);
    cursor = addCalendarDays(cursor, 1);
  }
  return days;
}

export function monthsInYear(yyyy: string): string[] {
  return Array.from({ length: 12 }, (_, index) => `${yyyy}-${String(index + 1).padStart(2, "0")}`);
}
