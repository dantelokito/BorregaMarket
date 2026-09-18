import { describe, expect, it } from "vitest";
import { patchProviderSettingsSchema } from "@/lib/validators/provider-settings";

describe("PATCH provider me F14 business fields", () => {
  it("accepts AMM coordinates with business data", () => {
    const parsed = patchProviderSettingsSchema.parse({
      businessName: "Frutas El Paraíso Centro",
      address: "Av. Juárez 123, Centro",
      city: "Monterrey",
      phone: "+528112345678",
      description: "Fruta de temporada",
      latitude: 25.6714,
      longitude: -100.3089,
    });
    expect(parsed.latitude).toBe(25.6714);
    expect(parsed.businessName).toBe("Frutas El Paraíso Centro");
  });

  it("rejects geo outside AMM with Monterrey message", () => {
    const result = patchProviderSettingsSchema.safeParse({
      latitude: 19.43,
      longitude: -99.13,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes("Monterrey"))).toBe(
        true
      );
    }
  });

  it("rejects incomplete lat/lng pair", () => {
    const result = patchProviderSettingsSchema.safeParse({ latitude: 25.6714 });
    expect(result.success).toBe(false);
  });

  it("rejects isVerified via strict schema", () => {
    const result = patchProviderSettingsSchema.safeParse({ isVerified: false });
    expect(result.success).toBe(false);
  });
});
