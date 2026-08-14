import { describe, expect, it } from "vitest";
import { cartItemCount, cartTotal, setItemQuantity, type SessionCart } from "@/lib/cart/session-cart";

function sampleCart(): SessionCart {
  return {
    providerId: "p1",
    providerName: "Frutas El Paraíso",
    items: [
      {
        providerProductId: "pp1",
        name: "Mango",
        unitPrice: 45,
        unitOfMeasure: "KG",
        quantity: 1.5,
      },
    ],
  };
}

describe("session-cart", () => {
  it("counts items with quantity > 0", () => {
    expect(cartItemCount(sampleCart())).toBe(1);
    expect(cartItemCount(null)).toBe(0);
  });

  it("totals with 2 decimal rounding", () => {
    expect(cartTotal(sampleCart())).toBe(67.5);
  });

  it("removes a line when quantity is 0", () => {
    const next = setItemQuantity(sampleCart(), "pp1", 0);
    expect(next.items).toHaveLength(0);
  });
});
