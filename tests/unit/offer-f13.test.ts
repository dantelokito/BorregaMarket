import { describe, expect, it } from "vitest";
import { ProductUnit } from "@prisma/client";
import { Decimal } from "@/lib/money";
import { effectiveSaleUnit, sellableProviderProductWhere } from "@/lib/catalog/sellable";
import {
  assertUnitFactorChangeAllowed,
  ConfirmDiscardRequiredError,
  EncargarActiveError,
} from "@/lib/catalog/offer";

describe("F13 offer helpers", () => {
  it("falls back to master unit when saleUnit is null", () => {
    expect(effectiveSaleUnit(null, ProductUnit.KG)).toBe(ProductUnit.KG);
    expect(effectiveSaleUnit(ProductUnit.CAJA, ProductUnit.KG)).toBe(ProductUnit.CAJA);
  });

  it("sellable predicate includes archivedAt null", () => {
    expect(sellableProviderProductWhere.archivedAt).toBeNull();
    expect(sellableProviderProductWhere.isAvailable).toBe(true);
  });

  it("blocks unit change when Encargar reserved > 0", () => {
    expect(() =>
      assertUnitFactorChangeAllowed({
        reserved: new Decimal("1"),
        onHand: new Decimal("0"),
        unitOrFactorChanged: true,
        confirmDiscard: true,
      })
    ).toThrow(EncargarActiveError);
  });

  it("requires confirmDiscard when onHand != 0", () => {
    expect(() =>
      assertUnitFactorChangeAllowed({
        reserved: new Decimal("0"),
        onHand: new Decimal("2"),
        unitOrFactorChanged: true,
      })
    ).toThrow(ConfirmDiscardRequiredError);
  });

  it("allows discard with flag and no Encargar", () => {
    expect(
      assertUnitFactorChangeAllowed({
        reserved: new Decimal("0"),
        onHand: new Decimal("2"),
        unitOrFactorChanged: true,
        confirmDiscard: true,
      })
    ).toEqual({ discardOnHand: true });
  });
});
