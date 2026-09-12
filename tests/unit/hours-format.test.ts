import { describe, expect, it } from "vitest";
import { buildHoursRows, formatVerifiedSince } from "@/lib/providers/hours-format";

describe("buildHoursRows", () => {
  it("returns no rows when hours are not published", () => {
    expect(buildHoursRows(null)).toEqual([]);
    expect(buildHoursRows([])).toEqual([]);
  });

  it("orders days from Monday to Sunday", () => {
    const rows = buildHoursRows([
      { day: 0, open: null, close: null, closed: true },
      { day: 1, open: "08:00", close: "18:00", closed: false },
      { day: 6, open: "09:00", close: "14:00", closed: false },
    ]);
    expect(rows.map((r) => r.day)).toEqual([1, 6, 0]);
  });

  it("formats an open day", () => {
    const [row] = buildHoursRows([{ day: 1, open: "08:00", close: "18:00", closed: false }]);
    expect(row).toMatchObject({
      label: "Lunes",
      open: "08:00",
      close: "18:00",
      closed: false,
      rangeLabel: "08:00 – 18:00",
    });
  });

  it("formats a closed day without inventing hours", () => {
    const [row] = buildHoursRows([{ day: 0, open: null, close: null, closed: true }]);
    expect(row).toMatchObject({ label: "Domingo", open: "Cerrado", close: "—", rangeLabel: "Cerrado" });
  });
});

describe("formatVerifiedSince", () => {
  it("uses MM/AAAA from verifiedAt", () => {
    expect(formatVerifiedSince("2026-03-12T00:00:00.000Z")).toBe(
      "verificado a la borrega desde 03/2026"
    );
  });

  it("falls back to the generic copy without a date", () => {
    expect(formatVerifiedSince(null)).toBe("verificado a la borrega");
    expect(formatVerifiedSince("no-es-fecha")).toBe("verificado a la borrega");
  });
});
