import { describe, expect, it } from "vitest";
import { assertPublishablePrice, InvalidOfferPriceError } from "@/lib/catalog/offer";

describe("assertPublishablePrice F14", () => {
  it("allows price 0 when the offer stays unpublished", () => {
    expect(() => assertPublishablePrice(0, false)).not.toThrow();
  });

  it("rejects price 0 when publishing", () => {
    expect(() => assertPublishablePrice(0, true)).toThrow(InvalidOfferPriceError);
  });

  it("rejects missing price when publishing", () => {
    expect(() => assertPublishablePrice(undefined, true)).toThrow(InvalidOfferPriceError);
  });

  it("allows a positive price when publishing", () => {
    expect(() => assertPublishablePrice("45.00", true)).not.toThrow();
  });
});
