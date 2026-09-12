import { describe, expect, it } from "vitest";
import {
  currentDateForGrain,
  formatReportPeriodLabel,
  parseDashboardView,
  parseReportGrain,
  resolveReportDate,
} from "@/lib/reports/period";
import { isReportPeriodInFuture } from "@/lib/timezone";

const now = new Date("2026-08-16T18:00:00.000Z");

describe("report period helpers", () => {
  it("defaults view and grain", () => {
    expect(parseDashboardView(null)).toBe("resumen");
    expect(parseDashboardView("reportes")).toBe("reportes");
    expect(parseReportGrain(null)).toBe("month");
    expect(parseReportGrain("day")).toBe("day");
  });

  it("uses current Monterrey period when grain changes", () => {
    expect(currentDateForGrain("day", now)).toBe("2026-08-16");
    expect(currentDateForGrain("month", now)).toBe("2026-08");
    expect(currentDateForGrain("year", now)).toBe("2026");
  });

  it("rejects future periods and falls back to current", () => {
    expect(isReportPeriodInFuture("day", "2026-08-17", now)).toBe(true);
    expect(resolveReportDate("month", "2026-09", now)).toBe("2026-08");
    expect(resolveReportDate("month", "2026-08", now)).toBe("2026-08");
  });

  it("formats period labels", () => {
    expect(formatReportPeriodLabel("year", "2026")).toBe("2026");
    expect(formatReportPeriodLabel("month", "2026-08")).toBe("Agosto 2026");
    expect(formatReportPeriodLabel("day", "2026-08-16")).toMatch(/16/);
    expect(formatReportPeriodLabel("day", "2026-08-16")).toMatch(/2026/);
  });
});
