import { describe, expect, it } from "vitest";
import {
  assertNoPublicInventoryKeys,
  computeInventoryMetrics,
} from "@/lib/inventory/metrics";

describe("computeInventoryMetrics", () => {
  it("computes fill percent and low stock", () => {
    const metrics = computeInventoryMetrics({
      onHand: "2.000",
      reserved: "1.000",
      capacityMax: "20.000",
      alertThresholdPercent: 10,
      alertEnabled: true,
    });
    expect(metrics.fillPercent).toBe(10);
    expect(metrics.lowStockAlert).toBe(true);
    expect(metrics.onHand).toBe("2.000");
  });

  it("omits fill when there is no capacity", () => {
    const metrics = computeInventoryMetrics({
      onHand: "5",
      reserved: "0",
      capacityMax: null,
      alertThresholdPercent: 10,
      alertEnabled: true,
    });
    expect(metrics.fillPercent).toBeNull();
    expect(metrics.lowStockAlert).toBe(false);
  });

  it("flags negative on-hand when alert is on", () => {
    const metrics = computeInventoryMetrics({
      onHand: "-1",
      reserved: "0",
      capacityMax: "10",
      alertThresholdPercent: 10,
      alertEnabled: true,
    });
    expect(metrics.lowStockAlert).toBe(true);
  });

  it("allows fill over 100", () => {
    const metrics = computeInventoryMetrics({
      onHand: "25",
      reserved: "0",
      capacityMax: "20",
      alertThresholdPercent: 10,
      alertEnabled: false,
    });
    expect(metrics.fillPercent).toBe(125);
    expect(metrics.lowStockAlert).toBe(false);
  });
});

describe("assertNoPublicInventoryKeys", () => {
  it("detects leaked keys", () => {
    expect(assertNoPublicInventoryKeys({ products: [{ name: "Mango", onHand: "1" }] })).toEqual([
      "onHand",
    ]);
  });

  it("passes a public product card", () => {
    expect(
      assertNoPublicInventoryKeys({
        products: [{ name: "Mango", price: 45, imageUrl: "/api/media/x.webp" }],
      })
    ).toEqual([]);
  });
});
