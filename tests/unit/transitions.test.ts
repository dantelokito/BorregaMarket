import { describe, expect, it } from "vitest";
import { OrderStatus, UserRole } from "@prisma/client";
import { allowedTransitions, canTransition } from "@/lib/orders/transitions";

describe("order transitions", () => {
  it("allows provider PENDING → CONFIRMED | CANCELLED", () => {
    expect(allowedTransitions(OrderStatus.PENDING)).toEqual([
      OrderStatus.CONFIRMED,
      OrderStatus.CANCELLED,
    ]);
    expect(
      canTransition(OrderStatus.PENDING, OrderStatus.CONFIRMED, UserRole.PROVIDER)
    ).toBe(true);
  });

  it("blocks terminal states", () => {
    expect(allowedTransitions(OrderStatus.DELIVERED)).toEqual([]);
    expect(allowedTransitions(OrderStatus.CANCELLED)).toEqual([]);
    expect(
      canTransition(OrderStatus.DELIVERED, OrderStatus.PENDING, UserRole.PROVIDER)
    ).toBe(false);
  });

  it("lets CLIENT cancel only PENDING", () => {
    expect(
      canTransition(OrderStatus.PENDING, OrderStatus.CANCELLED, UserRole.CLIENT)
    ).toBe(true);
    expect(
      canTransition(OrderStatus.CONFIRMED, OrderStatus.CANCELLED, UserRole.CLIENT)
    ).toBe(false);
    expect(
      canTransition(OrderStatus.PENDING, OrderStatus.CONFIRMED, UserRole.CLIENT)
    ).toBe(false);
  });

  it("follows CONFIRMED → IN_TRANSIT → DELIVERED", () => {
    expect(
      canTransition(OrderStatus.CONFIRMED, OrderStatus.IN_TRANSIT, UserRole.PROVIDER)
    ).toBe(true);
    expect(
      canTransition(OrderStatus.IN_TRANSIT, OrderStatus.DELIVERED, UserRole.ADMIN)
    ).toBe(true);
  });
});
