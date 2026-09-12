import { describe, expect, it } from "vitest";
import { exploreChipFallbackLabel, resolveExploreCenter } from "@/lib/maps/explore-center";
import { SAN_NICOLAS_CENTER } from "@/lib/maps/constants";
import type { UserAddress } from "@/lib/api/types";

function address(overrides: Partial<UserAddress> & { id: string }): UserAddress {
  return {
    label: "Casa",
    formattedAddress: "Av. Juárez 123, Monterrey",
    lat: 25.6714,
    lng: -100.3089,
    isFavorite: true,
    isDefault: false,
    lastUsedAt: null,
    createdAt: "2026-08-14T18:00:00.000Z",
    ...overrides,
  };
}

describe("resolveExploreCenter", () => {
  it("uses the URL pin above everything else", () => {
    const center = resolveExploreCenter({
      urlPin: { lat: 25.7, lng: -100.4, radiusKm: 4 },
      addresses: [address({ id: "a1", isDefault: true, lastUsedAt: "2026-08-18T10:00:00.000Z" })],
    });
    expect(center).toMatchObject({ lat: 25.7, lng: -100.4, radiusKm: 4, source: "url" });
  });

  it("prefers the most recent last used address over the default one", () => {
    const center = resolveExploreCenter({
      addresses: [
        address({ id: "default", isDefault: true, lat: 25.6, lng: -100.2 }),
        address({ id: "old", lastUsedAt: "2026-08-10T10:00:00.000Z", lat: 25.5, lng: -100.1 }),
        address({ id: "recent", lastUsedAt: "2026-08-18T10:00:00.000Z", lat: 25.8, lng: -100.5 }),
      ],
    });
    expect(center).toMatchObject({
      addressId: "recent",
      lat: 25.8,
      lng: -100.5,
      radiusKm: 10,
      source: "last-used",
    });
  });

  it("falls back to the default address when nothing was used yet", () => {
    const center = resolveExploreCenter({
      addresses: [address({ id: "a1" }), address({ id: "a2", isDefault: true, lat: 25.9, lng: -100.6 })],
    });
    expect(center).toMatchObject({ addressId: "a2", source: "default-address" });
  });

  it("ignores the stored pin for a signed in client", () => {
    const center = resolveExploreCenter({
      addresses: [],
      storedPin: { lat: 25.1, lng: -100.9, radiusKm: 3 },
      guest: false,
    });
    expect(center.source).toBe("san-nicolas");
  });

  it("uses the stored pin only as the guest queue", () => {
    const center = resolveExploreCenter({
      addresses: [],
      storedPin: { lat: 25.1, lng: -100.9, radiusKm: 3 },
      guest: true,
    });
    expect(center).toMatchObject({ lat: 25.1, lng: -100.9, radiusKm: 3, source: "stored" });
  });

  it("does not label a Monterrey URL pin as San Nicolás", () => {
    expect(exploreChipFallbackLabel(25.6714, -100.3089)).toBe("Ubicación");
    expect(exploreChipFallbackLabel(SAN_NICOLAS_CENTER.lat, SAN_NICOLAS_CENTER.lng)).toBe(
      "San Nicolás"
    );
  });

  it("defaults to San Nicolás with 10 km", () => {
    const center = resolveExploreCenter({});
    expect(center).toMatchObject({
      lat: SAN_NICOLAS_CENTER.lat,
      lng: SAN_NICOLAS_CENTER.lng,
      radiusKm: 10,
      source: "san-nicolas",
    });
  });
});
