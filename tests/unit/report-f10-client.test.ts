import { describe, expect, it } from "vitest";
import {
  COPY_FROM_AFTER_TO,
  COPY_FUTURE,
  COPY_OVER_366,
  inclusiveDaySpan,
  monthShortcutRange,
  validateDateRange,
} from "@/lib/reports/date-range";
import { buildReportRangeQuery } from "@/lib/api/provider-ops";
import { shouldShowDemoAccounts } from "@/lib/auth/demo-accounts";

describe("date range F10", () => {
  it("rejects from after to", () => {
    expect(validateDateRange("2026-08-10", "2026-08-01", "2026-08-28")).toBe(COPY_FROM_AFTER_TO);
  });

  it("rejects span over 366 days", () => {
    expect(inclusiveDaySpan("2025-08-01", "2026-08-02")).toBe(367);
    expect(validateDateRange("2025-08-01", "2026-08-02", "2026-08-28")).toBe(COPY_OVER_366);
  });

  it("rejects future dates vs today Monterrey", () => {
    expect(validateDateRange("2026-08-01", "2026-08-31", "2026-08-28")).toBe(COPY_FUTURE);
  });

  it("clamps current month shortcut to today", () => {
    expect(monthShortcutRange("2026-08", "2026-08-28")).toEqual({
      from: "2026-08-01",
      to: "2026-08-28",
    });
    expect(monthShortcutRange("2026-07", "2026-08-28")).toEqual({
      from: "2026-07-01",
      to: "2026-07-31",
    });
  });
});

describe("buildReportRangeQuery", () => {
  it("omits productIds when empty", () => {
    expect(buildReportRangeQuery("2026-08-01", "2026-08-28")).toBe(
      "?from=2026-08-01&to=2026-08-28"
    );
    expect(buildReportRangeQuery("2026-08-01", "2026-08-28", [])).toBe(
      "?from=2026-08-01&to=2026-08-28"
    );
  });

  it("appends repeatable productIds", () => {
    const qs = buildReportRangeQuery("2026-08-01", "2026-08-28", ["abc", "quickSale"]);
    expect(qs).toContain("productIds=abc");
    expect(qs).toContain("productIds=quickSale");
    expect(qs).not.toContain("grain");
  });
});

describe("shouldShowDemoAccounts", () => {
  it("unmounts in production", () => {
    expect(shouldShowDemoAccounts("production")).toBe(false);
    expect(shouldShowDemoAccounts("development")).toBe(true);
    expect(shouldShowDemoAccounts("test")).toBe(true);
  });
});
