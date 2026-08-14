import { describe, expect, it } from "vitest";
import { ORDER_STATUS_LABEL, shortOrderId, toUnitOfMeasure } from "@/lib/orders/labels";

describe("order labels", () => {
  it("maps IN_TRANSIT to Listo para recoger", () => {
    expect(ORDER_STATUS_LABEL.IN_TRANSIT).toBe("Listo para recoger");
    expect(ORDER_STATUS_LABEL.IN_TRANSIT).not.toContain("camino");
  });

  it("maps catalog units to PZA/KG/GR", () => {
    expect(toUnitOfMeasure("PIEZA")).toBe("PZA");
    expect(toUnitOfMeasure("KG")).toBe("KG");
    expect(toUnitOfMeasure("GRAMO")).toBe("GR");
  });

  it("uses last 4 chars as short id", () => {
    expect(shortOrderId("abcdeA7F3")).toBe("A7F3");
  });
});
