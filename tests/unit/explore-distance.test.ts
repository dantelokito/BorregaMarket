import { describe, expect, it } from "vitest";
import {
  distanceRatio,
  formatCardEta,
  formatSearchDistance,
} from "@/lib/ui/explore-distance";

describe("explore distance F9", () => {
  it("formats meters under 1 km", () => {
    expect(formatSearchDistance(0.5)).toBe("A 500 m de tu búsqueda");
    expect(formatSearchDistance(0.001)).toBe("A 1 m de tu búsqueda");
  });

  it("formats kilometers at or above 1 km", () => {
    expect(formatSearchDistance(1)).toBe("A 1 km de tu búsqueda");
    expect(formatSearchDistance(2.4)).toBe("A 2.4 km de tu búsqueda");
  });

  it("prefers walking ETA under 15 min at 5 km/h", () => {
    // 0.5 km → 6 min a pie
    expect(formatCardEta(0.5)).toBe("~6 min a pie");
  });

  it("uses auto ETA when walking would be 15+ min", () => {
    // 2 km walk = 24 min → auto at 25 km/h ≈ 5 min
    expect(formatCardEta(2)).toBe("~5 min en auto");
  });

  it("clamps distance ratio to 0–1", () => {
    expect(distanceRatio(5, 10)).toBe(0.5);
    expect(distanceRatio(12, 10)).toBe(1);
    expect(distanceRatio(0, 10)).toBe(0);
  });
});
