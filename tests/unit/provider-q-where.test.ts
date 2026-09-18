import { describe, expect, it } from "vitest";
import { buildWhere } from "@/lib/services/provider.service";

describe("provider q union (US-EXPLORE-06)", () => {
  it("matches businessName, description, or sellable product name/slug", () => {
    const where = buildWhere({ q: "mango" });
    const or = (where.AND as Array<{ OR?: unknown[] }>)[0]?.OR;
    expect(or).toHaveLength(3);
    const productSome = or?.[2] as {
      providerProducts: {
        some: {
          isAvailable: boolean;
          archivedAt: null;
          product: { isActive: boolean; OR: unknown[] };
        };
      };
    };
    expect(productSome.providerProducts.some.isAvailable).toBe(true);
    expect(productSome.providerProducts.some.archivedAt).toBeNull();
    expect(productSome.providerProducts.some.product.isActive).toBe(true);
    expect(productSome.providerProducts.some.product.OR).toHaveLength(2);
  });
});

describe("provider offersWholesale / offersDelivery filters (F9)", () => {
  it("adds offersWholesale when true", () => {
    const where = buildWhere({ offersWholesale: true });
    expect(where.offersWholesale).toBe(true);
    expect(where.offersDelivery).toBeUndefined();
  });

  it("adds offersDelivery when true", () => {
    const where = buildWhere({ offersDelivery: true });
    expect(where.offersDelivery).toBe(true);
    expect(where.offersWholesale).toBeUndefined();
  });

  it("AND both flags with q", () => {
    const where = buildWhere({
      offersWholesale: true,
      offersDelivery: true,
      q: "mango",
    });
    expect(where.offersWholesale).toBe(true);
    expect(where.offersDelivery).toBe(true);
    expect(where.isActive).toBe(true);
    expect(where.AND).toBeDefined();
  });

  it("omits flags when not set", () => {
    const where = buildWhere({});
    expect(where.offersWholesale).toBeUndefined();
    expect(where.offersDelivery).toBeUndefined();
  });

  it("adds scope GLOBAL when filtering by category", () => {
    const where = buildWhere({ category: "FRUTA" });
    const some = (
      where.AND as Array<{
        providerProducts?: { some: { product: { scope: string } } };
      }>
    )[0]?.providerProducts?.some;
    expect(some?.product.scope).toBe("GLOBAL");
  });
});
