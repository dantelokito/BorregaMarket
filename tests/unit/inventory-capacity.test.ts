import { describe, expect, it } from "vitest";
import {
  capacityBarWidth,
  fillAriaText,
  formatFillPercent,
  isOverCapacity,
  parseQtyString,
} from "@/lib/inventory/capacity";

describe("capacidad inventario F12", () => {
  it("permite fillPercent mayor a 100 y marca sobre tope", () => {
    expect(isOverCapacity(110)).toBe(true);
    expect(capacityBarWidth(110)).toBe(100);
    expect(formatFillPercent(110)).toBe("110%");
    expect(fillAriaText(110)).toContain("110");
  });

  it("sin tope no inventa porcentaje", () => {
    expect(isOverCapacity(null)).toBe(false);
    expect(capacityBarWidth(null)).toBe(0);
    expect(formatFillPercent(null)).toBeNull();
    expect(fillAriaText(null)).toBe("Sin tope de capacidad");
  });

  it("parsea reserved decimal string", () => {
    expect(parseQtyString("3.000")).toBe(3);
    expect(parseQtyString("0")).toBe(0);
  });
});
