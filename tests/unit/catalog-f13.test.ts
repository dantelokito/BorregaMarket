import { describe, expect, it } from "vitest";
import {
  deleteNotAllowedCopy,
  effectiveSaleUnit,
  factorRequired,
  formatPriceHistoryLine,
  isConfirmDiscardRequired,
  isEncargarActiveError,
  onHandIsNonZero,
  reservedIsPositive,
  staleOfferCopy,
  unitOrFactorChanged,
} from "@/lib/catalog/f13";
import { offerPatchSchema } from "@/lib/validators/catalog-f13";

describe("F13 catalog helpers", () => {
  it("falls back sale unit to master", () => {
    expect(effectiveSaleUnit(null, "KG")).toBe("KG");
    expect(effectiveSaleUnit("CAJA", "KG")).toBe("CAJA");
  });

  it("requires factor only for CAJA", () => {
    expect(factorRequired("CAJA")).toBe(true);
    expect(factorRequired("KG")).toBe(false);
  });

  it("detects non-zero on-hand", () => {
    expect(onHandIsNonZero("0")).toBe(false);
    expect(onHandIsNonZero("1.5")).toBe(true);
  });

  it("detects Encargar reserved", () => {
    expect(reservedIsPositive("0")).toBe(false);
    expect(reservedIsPositive("2")).toBe(true);
  });

  it("detects unit or factor change", () => {
    expect(
      unitOrFactorChanged({
        prevSaleUnit: "KG",
        nextSaleUnit: "CAJA",
        prevFactor: null,
        nextFactor: "12",
      })
    ).toBe(true);
  });

  it("formats history first assignment", () => {
    const line = formatPriceHistoryLine({
      previousPrice: null,
      price: "25.00",
      createdAt: "2026-09-01T15:00:00.000Z",
    });
    expect(line).toContain("— → $25.00");
  });

  it("maps 405 copy", () => {
    expect(deleteNotAllowedCopy(405)).toMatch(/DELETE|Oculta/i);
  });

  it("stale offer copy", () => {
    expect(staleOfferCopy()).toBe("El producto ya no está disponible");
  });

  it("detects Encargar 409 and confirmDiscard 400", () => {
    expect(isEncargarActiveError(409, [{ field: "saleUnit", message: "No se puede cambiar unidad o factor con Encargar activo" }])).toBe(
      true
    );
    expect(
      isConfirmDiscardRequired(400, [
        { field: "confirmDiscard", message: "Confirma el descarte de inventario al cambiar unidad o factor" },
      ])
    ).toBe(true);
  });
});

describe("offerPatchSchema", () => {
  it("requires factor when CAJA", () => {
    const r = offerPatchSchema.safeParse({ saleUnit: "CAJA", boxContentFactor: "" });
    expect(r.success).toBe(false);
  });

  it("accepts CAJA with factor", () => {
    const r = offerPatchSchema.safeParse({
      saleUnit: "CAJA",
      boxContentFactor: "12.000",
      price: "10.00",
    });
    expect(r.success).toBe(true);
  });
});
