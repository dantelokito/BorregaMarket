import { describe, expect, it } from "vitest";
import { EMPTY_REVIEWS_COPY, ratingDisplayLabel } from "@/lib/ui/reviews-copy";
import { inTransitLabel } from "@/lib/orders/labels";

describe("reviews copy", () => {
  it("never shows empty stars for zero reviews", () => {
    expect(ratingDisplayLabel(0, 0)).toBe(EMPTY_REVIEWS_COPY);
    expect(ratingDisplayLabel(0, 0)).not.toMatch(/★|⭐/);
  });

  it("shows rating when there are reviews", () => {
    expect(ratingDisplayLabel(4.5, 3)).toBe("4.5 (3 reseñas)");
  });
});

describe("IN_TRANSIT copy", () => {
  it("uses En camino only for DELIVERY", () => {
    expect(inTransitLabel("DELIVERY")).toBe("En camino");
    expect(inTransitLabel("PICKUP")).toBe("Listo para recoger");
  });
});
