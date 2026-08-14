import { describe, expect, it } from "vitest";
import {
  addCalendarDays,
  monterreyDayStartUtc,
  rollingWindowUtc,
  ymdInTimeZone,
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
});
