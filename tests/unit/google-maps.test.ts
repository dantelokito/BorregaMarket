import { describe, expect, it } from "vitest";
import {
  googleReviewsGate,
  isValidGoogleMapsUrl,
  isValidGooglePlaceId,
} from "@/lib/validation/google-maps";
import { formatAuthorName } from "@/lib/validators/review";
import { bodyTouchesGoogle } from "@/lib/validators/provider-settings";

describe("google maps validation", () => {
  it("accepts https Maps hosts and rejects others", () => {
    expect(isValidGoogleMapsUrl("https://maps.google.com/?cid=1")).toBe(true);
    expect(isValidGoogleMapsUrl("https://maps.app.goo.gl/abc")).toBe(true);
    expect(isValidGoogleMapsUrl("http://maps.google.com/?cid=1")).toBe(false);
    expect(isValidGoogleMapsUrl("https://evil.example/?q=maps.google.com")).toBe(false);
  });

  it("validates Place ID length", () => {
    expect(isValidGooglePlaceId("ChIJN1t_tDeu")).toBe(true);
    expect(isValidGooglePlaceId("short")).toBe(false);
  });

  it("gates public embed on verified + enabled + identifier", () => {
    expect(
      googleReviewsGate({
        isVerified: false,
        googleReviewsEnabled: true,
        googlePlaceId: "ChIJN1t_tDeu",
        googleMapsUrl: null,
      }).enabled
    ).toBe(false);
    expect(
      googleReviewsGate({
        isVerified: true,
        googleReviewsEnabled: true,
        googlePlaceId: "ChIJN1t_tDeu",
        googleMapsUrl: null,
      }).enabled
    ).toBe(true);
  });
});

describe("formatAuthorName", () => {
  it("uses first name and last initial", () => {
    expect(formatAuthorName("María González")).toBe("María G.");
  });
});

describe("bodyTouchesGoogle", () => {
  it("does not treat brand colors as Google fields", () => {
    expect(
      bodyTouchesGoogle({
        primaryColor: "#1B5E20",
        secondaryColor: "#0D47A1",
      })
    ).toBe(false);
  });
});
