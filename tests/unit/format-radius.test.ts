import { describe, expect, it } from "vitest";
import { formatRadius } from "@/lib/maps/format-radius";
import { previewDelays } from "@/lib/maps/preview-delays";

describe("formatRadius", () => {
  it("uses meters below 1 km", () => {
    expect(formatRadius(0.5)).toBe("500 m");
    expect(formatRadius(0.75)).toBe("750 m");
  });

  it("uses km with at most one decimal", () => {
    expect(formatRadius(1.5)).toBe("1.5 km");
    expect(formatRadius(10)).toBe("10 km");
  });
});

describe("previewDelays", () => {
  it("returns F8 delays and zeroes them for reduced motion", () => {
    expect(previewDelays(false)).toEqual({ open: 300, close: 150, longPress: 500 });
    expect(previewDelays(true)).toEqual({ open: 0, close: 0, longPress: 0 });
  });
});
