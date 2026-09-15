import { describe, expect, it } from "vitest";
import { ProductUnit, UnitOfMeasure } from "@prisma/client";
import { convertQtyToCatalog, formatOnHand } from "@/lib/inventory/convert-qty";

describe("convertQtyToCatalog", () => {
  it("converts KG from grams", () => {
    expect(convertQtyToCatalog(ProductUnit.KG, UnitOfMeasure.GR, "1500").toFixed(3)).toBe(
      "1.500"
    );
  });

  it("converts GRAMO from kilograms", () => {
    expect(convertQtyToCatalog(ProductUnit.GRAMO, UnitOfMeasure.KG, "1.5").toFixed(3)).toBe(
      "1500.000"
    );
  });

  it("uses identity for unmatched pairs", () => {
    expect(convertQtyToCatalog(ProductUnit.KG, UnitOfMeasure.PZA, "2").toFixed(3)).toBe("2.000");
  });

  it("formats three decimals", () => {
    expect(formatOnHand("12.5")).toBe("12.500");
  });
});
