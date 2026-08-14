import { describe, expect, it } from "vitest";
import { haversineKm, roundDistanceKm } from "@/lib/geo/haversine";
import { AVG_SPEED_KMH, computeEtaMinutes } from "@/lib/geo/eta";
import { isWithinMonterreyBounds } from "@/lib/geo/bounds";

describe("haversineKm", () => {
  it("returns 0 for the same point", () => {
    expect(haversineKm(25.6714, -100.3089, 25.6714, -100.3089)).toBe(0);
  });

  it("computes a positive distance between two Monterrey points", () => {
    const km = haversineKm(25.6714, -100.3095, 25.6515, -100.4025);
    expect(km).toBeGreaterThan(5);
    expect(km).toBeLessThan(15);
    expect(roundDistanceKm(km)).toBe(Number(km.toFixed(1)));
  });
});

describe("computeEtaMinutes", () => {
  it("uses only preparation when distance is 0", () => {
    const eta = computeEtaMinutes({
      preparationTimeMinutes: 20,
      distanceKm: 0,
    });
    expect(eta.travelMinutes).toBe(0);
    expect(eta.etaMinutes).toBe(20);
    expect(eta.copyKey).toBe("eta_prep_only");
  });

  it("adds at least 1 travel minute when there is distance", () => {
    const eta = computeEtaMinutes({
      preparationTimeMinutes: 20,
      distanceKm: 3.2,
    });
    const expectedTravel = Math.max(1, Math.round((3.2 / AVG_SPEED_KMH) * 60));
    expect(eta.travelMinutes).toBe(expectedTravel);
    expect(eta.etaMinutes).toBe(20 + expectedTravel);
    expect(eta.copyKey).toBe("eta_ready_approx");
  });
});

describe("Monterrey bounds", () => {
  it("accepts downtown and rejects far coords", () => {
    expect(isWithinMonterreyBounds(25.67, -100.31)).toBe(true);
    expect(isWithinMonterreyBounds(19.43, -99.13)).toBe(false);
  });
});
