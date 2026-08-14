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

  it("clamps radius 1-25", () => {
    expect(clampRadiusKm(0)).toBe(1);
    expect(clampRadiusKm(40)).toBe(25);
    expect(clampRadiusKm(undefined)).toBe(10);
  });
});
