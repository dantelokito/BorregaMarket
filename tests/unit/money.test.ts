import { describe, expect, it } from "vitest";
import {
  formatMoney,
  formatQuantity,
  hasMaxDecimals,
  lineSubtotal,
  sumMoney,
  toMoney,
  toQuantity,
} from "@/lib/money";

describe("money", () => {
  it("rounds subtotals half-up to 2 decimals", () => {
    expect(lineSubtotal("35.00", "1.250").toFixed(2)).toBe("43.75");
    expect(formatMoney(lineSubtotal("42.75", "2"))).toBe("85.50");
  });

  it("keeps quantity at 3 decimals", () => {
    expect(formatQuantity("1.25")).toBe("1.250");
    expect(toQuantity("1.2555").toFixed(3)).toBe("1.256");
  });

  it("sums money without float drift", () => {
    expect(formatMoney(sumMoney(["10.10", "20.20", "0.05"]))).toBe("30.35");
  });

  it("validates decimal places", () => {
    expect(hasMaxDecimals("1.250", 3)).toBe(true);
    expect(hasMaxDecimals("1.2500", 3)).toBe(false);
    expect(hasMaxDecimals("2", 3)).toBe(true);
    expect(toMoney("1.225").toFixed(2)).toBe("1.23");
  });
});
