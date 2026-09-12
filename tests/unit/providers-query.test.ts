import { describe, expect, it } from "vitest";
import { buildProvidersQuery, clampRadiusKm } from "@/lib/api/providers";

describe("providers geo query", () => {
  it("omits geo when lat/lng missing", () => {
    expect(buildProvidersQuery({ q: "manzana", radiusKm: 10 })).toBe("?q=manzana");
  });

  it("includes lat lng radius together", () => {
    const qs = buildProvidersQuery({ lat: 25.67, lng: -100.3, radiusKm: 8 });
    expect(qs).toContain("lat=25.67");
    expect(qs).toContain("lng=-100.3");
    expect(qs).toContain("radiusKm=8");
  });

  it("clamps radius 0.5–10 without rounding (CO-F8-001)", () => {
    expect(clampRadiusKm(0.5)).toBe(0.5);
    expect(clampRadiusKm(10)).toBe(10);
    expect(clampRadiusKm(0.7)).toBe(0.7);
    expect(clampRadiusKm(22)).toBe(10);
    expect(clampRadiusKm(0)).toBe(0.5);
    expect(clampRadiusKm(undefined)).toBe(10);
  });

  it("drops a single character q so explore never fires a 400 (US-EXPLORE-06)", () => {
    expect(buildProvidersQuery({ q: "m", lat: 25.67, lng: -100.3 })).not.toContain("q=");
  });

  it("keeps the explore page size of 20 (US-GEO-12)", () => {
    expect(buildProvidersQuery({ page: 2, limit: 20 })).toBe("?page=2&limit=20");
  });

  it("sends offersWholesale/offersDelivery only when true (US-EXPLORE-11)", () => {
    const qs = buildProvidersQuery({
      lat: 25.67,
      lng: -100.3,
      radiusKm: 5,
      offersWholesale: true,
      offersDelivery: true,
    });
    expect(qs).toContain("offersWholesale=true");
    expect(qs).toContain("offersDelivery=true");
    expect(buildProvidersQuery({ offersWholesale: false })).not.toContain("offersWholesale");
    expect(buildProvidersQuery({ offersDelivery: false })).not.toContain("offersDelivery");
  });

  it("supports typeahead limit=10 on the same GET (US-EXPLORE-09)", () => {
    const qs = buildProvidersQuery({
      q: "fru",
      lat: 25.67,
      lng: -100.3,
      radiusKm: 10,
      limit: 10,
      page: 1,
    });
    expect(qs).toContain("q=fru");
    expect(qs).toContain("limit=10");
    expect(qs).toContain("page=1");
  });
});
