import { describe, expect, it } from "vitest";
import { patchProviderSettingsSchema } from "@/lib/validators/provider-settings";

describe("PATCH provider me openingHours", () => {
  it("accepts a valid weekday schedule", () => {
    const parsed = patchProviderSettingsSchema.parse({
      openingHours: [{ day: 1, open: "08:00", close: "18:00", closed: false }],
      offersRetail: true,
    });
    expect(parsed.openingHours?.[0]?.day).toBe(1);
  });

  it("rejects overnight (open >= close)", () => {
    const result = patchProviderSettingsSchema.safeParse({
      openingHours: [{ day: 1, open: "18:00", close: "08:00", closed: false }],
    });
    expect(result.success).toBe(false);
  });
});
