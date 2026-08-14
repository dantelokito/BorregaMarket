import { describe, expect, it } from "vitest";
import { formatCurrency, formatQty, lineAmount, parseDecimalInput, qtyToApiString } from "@/lib/format";

describe("format", () => {
  it("formats money for display", () => {
    expect(formatCurrency(85.5)).toContain("85.50");
    expect(formatCurrency("85.50")).toContain("85.50");
  });

  it("trims quantity trailing zeros", () => {
    expect(formatQty(2)).toBe("2");
    expect(formatQty(1.25)).toBe("1.25");
  });

  it("serializes qty with 3 decimals for API", () => {
    expect(qtyToApiString(2)).toBe("2.000");
    expect(qtyToApiString(1.25)).toBe("1.250");
  });

  it("parses decimal input with max 3 places", () => {
    expect(parseDecimalInput("1,250")).toBe(1.25);
    expect(parseDecimalInput("1.2504")).toBeNull();
    expect(parseDecimalInput("abc")).toBeNull();
  });

  it("rounds line amounts to 2 decimals", () => {
    expect(lineAmount(1.25, 35)).toBe(43.75);
  });
});
