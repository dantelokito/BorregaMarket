import { describe, expect, it } from "vitest";
import {
  DEFAULT_RADIUS_KM,
  MAX_RADIUS_KM,
  MEXICO_MAP_BOUNDS,
  MEXICO_VIEWBOX,
  MIN_RADIUS_KM,
  RADIUS_STEP_KM,
} from "@/lib/maps/constants";
import { isInMexico } from "@/lib/geo/bounds";
import { clampRadiusKm } from "@/lib/api/providers";

describe("explore F8 constants", () => {
  it("keeps slider range 0.5–10 with step 0.5", () => {
    expect(MIN_RADIUS_KM).toBe(0.5);
    expect(MAX_RADIUS_KM).toBe(10);
    expect(DEFAULT_RADIUS_KM).toBe(10);
    expect(RADIUS_STEP_KM).toBe(0.5);
  });

  it("defines Mexico map bounds matching ADR-028", () => {
    expect(MEXICO_VIEWBOX).toBe("-118.3649,32.7187,-86.7104,14.5329");
    expect(MEXICO_MAP_BOUNDS).toEqual([
      [14.5329, -118.3649],
      [32.7187, -86.7104],
    ]);
    expect(isInMexico(25.7475, -100.283)).toBe(true);
    expect(isInMexico(19.43, -99.13)).toBe(true);
    expect(isInMexico(33.0, -99.0)).toBe(false);
  });

  it("does not send an out-of-range radius without clamping", () => {
    expect(clampRadiusKm(22)).toBe(10);
    expect(clampRadiusKm(0.5)).toBe(0.5);
  });
});
