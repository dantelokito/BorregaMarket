import { describe, expect, it } from "vitest";
import { UnitOfMeasure } from "@prisma/client";
import {
  consolidateMarketplaceItems,
  hasPosLineXor,
} from "@/lib/orders/items";
import { formatQuantity } from "@/lib/money";
import {
  createMarketplaceOrderSchema,
  createPosSaleSchema,
} from "@/lib/validators/order";

describe("consolidateMarketplaceItems", () => {
  it("sums quantity for the same product and UoM", () => {
    const lines = consolidateMarketplaceItems([
      {
        providerProductId: "pp1",
        quantity: "1",
        unitOfMeasure: UnitOfMeasure.PZA,
      },
      {
        providerProductId: "pp1",
        quantity: "2.5",
        unitOfMeasure: UnitOfMeasure.PZA,
      },
      {
        providerProductId: "pp1",
        quantity: "1",
        unitOfMeasure: UnitOfMeasure.KG,
      },
    ]);
    expect(lines).toHaveLength(2);
    const pza = lines.find((line) => line.unitOfMeasure === UnitOfMeasure.PZA);
    expect(formatQuantity(pza!.quantity)).toBe("3.500");
  });
});

describe("POS XOR", () => {
  it("requires exactly one of catalog or customItem", () => {
    expect(hasPosLineXor({ providerProductId: "pp1" })).toBe(true);
    expect(hasPosLineXor({ customItem: { name: "Piña", unitPrice: "35" } })).toBe(
      true
    );
    expect(hasPosLineXor({})).toBe(false);
    expect(
      hasPosLineXor({
        providerProductId: "pp1",
        customItem: { name: "Piña", unitPrice: "35" },
      })
    ).toBe(false);
  });
});

describe("order validators", () => {
  it("rejects customItem on marketplace orders", () => {
    const result = createMarketplaceOrderSchema.safeParse({
      providerId: "prov1",
      items: [
        {
          providerProductId: "pp1",
          quantity: "1",
          customItem: { name: "x", unitPrice: "1" },
        },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.path.includes("customItem"))
      ).toBe(true);
    }
  });

  it("accepts POS custom line and UNPAID+DELIVERED at schema level", () => {
    const result = createPosSaleSchema.safeParse({
      paymentMethod: "UNPAID",
      status: "DELIVERED",
      items: [
        {
          customItem: { name: "Piña miel", unitPrice: "35.00" },
          quantity: "2",
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects POS lines without XOR", () => {
    const result = createPosSaleSchema.safeParse({
      paymentMethod: "CASH",
      items: [{ quantity: "1" }],
    });
    expect(result.success).toBe(false);
  });
});
