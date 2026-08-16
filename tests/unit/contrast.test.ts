import { describe, expect, it } from "vitest";
import {
  BRAND_PAIR_MESSAGE,
  HEX_FORMAT_MESSAGE,
  PRIMARY_CONTRAST_MESSAGE,
  SECONDARY_CONTRAST_MESSAGE,
  canonicalizeHex,
  contrastRatio,
  contrastVsWhite,
  isBrandPairValid,
  isPrimaryContrastValid,
  isSecondaryContrastValid,
  parseHexRgb,
} from "@/lib/color/contrast";
import { patchProviderSettingsSchema } from "@/lib/validators/provider-settings";

describe("contrast WCAG 2.1", () => {
  it("parses and canonicalizes #RRGGBB", () => {
    expect(parseHexRgb("#1b5e20")).toEqual({ r: 27, g: 94, b: 32 });
    expect(canonicalizeHex("#1b5e20")).toBe("#1B5E20");
    expect(canonicalizeHex("1B5E20")).toBeNull();
    expect(canonicalizeHex("#1B5")).toBeNull();
  });

  it("computes black vs white as 21:1", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
  });

  it("accepts dark green as primary (>= 4.5:1 vs white)", () => {
    expect(contrastVsWhite("#1B5E20")).toBeGreaterThanOrEqual(4.5);
    expect(isPrimaryContrastValid("#1B5E20")).toBe(true);
  });

  it("rejects amber as primary and yellow as secondary", () => {
    expect(isPrimaryContrastValid("#F9A825")).toBe(false);
    expect(isSecondaryContrastValid("#FFFF00")).toBe(false);
  });

  it("validates a complete brand pair", () => {
    expect(isBrandPairValid("#1B5E20", "#0D47A1")).toBe(true);
    expect(isBrandPairValid("#1B5E20", null)).toBe(false);
    expect(isBrandPairValid(null, null)).toBe(false);
  });
});

describe("patchProviderSettingsSchema brand pair", () => {
  it("accepts a valid hex pair and reset", () => {
    expect(
      patchProviderSettingsSchema.safeParse({
        primaryColor: "#1b5e20",
        secondaryColor: "#0d47a1",
      }).success
    ).toBe(true);
    expect(
      patchProviderSettingsSchema.safeParse({
        primaryColor: null,
        secondaryColor: null,
      }).success
    ).toBe(true);
  });

  it("rejects an incomplete pair", () => {
    const result = patchProviderSettingsSchema.safeParse({
      primaryColor: "#1B5E20",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(BRAND_PAIR_MESSAGE);
    }
  });

  it("rejects shorthand and missing hash", () => {
    const short = patchProviderSettingsSchema.safeParse({
      primaryColor: "#1B5",
      secondaryColor: "#0D47A1",
    });
    expect(short.success).toBe(false);
    if (!short.success) {
      expect(short.error.issues.some((issue) => issue.message === HEX_FORMAT_MESSAGE)).toBe(
        true
      );
    }
  });

  it("rejects insufficient contrast without persisting intent", () => {
    const primary = patchProviderSettingsSchema.safeParse({
      primaryColor: "#F9A825",
      secondaryColor: "#0D47A1",
    });
    expect(primary.success).toBe(false);
    if (!primary.success) {
      expect(primary.error.issues[0].message).toBe(PRIMARY_CONTRAST_MESSAGE);
    }

    const secondary = patchProviderSettingsSchema.safeParse({
      primaryColor: "#1B5E20",
      secondaryColor: "#FFFF00",
    });
    expect(secondary.success).toBe(false);
    if (!secondary.success) {
      expect(secondary.error.issues[0].message).toBe(SECONDARY_CONTRAST_MESSAGE);
    }
  });
});
