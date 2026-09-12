import { describe, expect, it } from "vitest";
import {
  addCalendarDays,
  isReportPeriodInFuture,
  monterreyDayStartUtc,
  monterreyMonthRangeUtc,
  monterreyYearRangeUtc,
  monthsInYear,
  reportWindowUtc,
  rollingWindowUtc,
  ymdInTimeZone,
  ymdsInMonth,
} from "@/lib/timezone";

describe("timezone helpers", () => {
  it("formats America/Monterrey as YYYY-MM-DD", () => {
    const utc = new Date("2026-08-13T08:00:00.000Z");
    expect(ymdInTimeZone(utc)).toBe("2026-08-13");
  });

  it("maps Monterrey midnight to 06:00 UTC", () => {
    expect(monterreyDayStartUtc("2026-08-13").toISOString()).toBe(
      "2026-08-13T06:00:00.000Z"
    );
  });

  it("builds a 30-day window ending tomorrow local", () => {
    const window = rollingWindowUtc("2026-08-13", 30);
    expect(window.start.toISOString()).toBe("2026-07-15T06:00:00.000Z");
    expect(window.end.toISOString()).toBe("2026-08-14T06:00:00.000Z");
    expect(addCalendarDays("2026-08-13", -6)).toBe("2026-08-07");
  });

  it("builds day/month/year windows at Monterrey midnight UTC-6", () => {
    const day = reportWindowUtc("day", "2026-08-16");
    expect(day.from.toISOString()).toBe("2026-08-16T06:00:00.000Z");
    expect(day.to.toISOString()).toBe("2026-08-17T06:00:00.000Z");

    const month = monterreyMonthRangeUtc("2026-08");
    expect(month.start.toISOString()).toBe("2026-08-01T06:00:00.000Z");
    expect(month.end.toISOString()).toBe("2026-09-01T06:00:00.000Z");

    const year = monterreyYearRangeUtc("2026");
    expect(year.start.toISOString()).toBe("2026-01-01T06:00:00.000Z");
    expect(year.end.toISOString()).toBe("2027-01-01T06:00:00.000Z");
  });

  it("treats the in-progress period as allowed and a later period as future", () => {
    const now = new Date("2026-08-16T18:00:00.000Z");
    expect(isReportPeriodInFuture("day", "2026-08-16", now)).toBe(false);
    expect(isReportPeriodInFuture("day", "2026-08-17", now)).toBe(true);
    expect(isReportPeriodInFuture("month", "2026-08", now)).toBe(false);
    expect(isReportPeriodInFuture("month", "2026-09", now)).toBe(true);
    expect(isReportPeriodInFuture("year", "2026", now)).toBe(false);
    expect(isReportPeriodInFuture("year", "2027", now)).toBe(true);
  });

  it("lists every day of the month and twelve months of the year", () => {
    expect(ymdsInMonth("2026-02")).toHaveLength(28);
    expect(ymdsInMonth("2026-08")[0]).toBe("2026-08-01");
    expect(ymdsInMonth("2026-08").at(-1)).toBe("2026-08-31");
    expect(monthsInYear("2026")).toEqual([
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
      "2026-11",
      "2026-12",
    ]);
  });
});
