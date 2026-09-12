import type { UserAddress } from "@/lib/api/types";
import { DEFAULT_RADIUS_KM, SAN_NICOLAS_CENTER, type ExplorePin } from "@/lib/maps/constants";

export type ExploreCenterSource =
  | "url"
  | "last-used"
  | "default-address"
  | "stored"
  | "san-nicolas";

export interface ExploreCenter {
  lat: number;
  lng: number;
  radiusKm: number;
  label?: string;
  addressId?: string;
  source: ExploreCenterSource;
}

export interface ResolveExploreCenterInput {
  urlPin?: { lat: number; lng: number; radiusKm?: number } | null;
  addresses?: UserAddress[] | null;
  /** sessionStorage pin: only a queue for the guest → login → explore round trip. */
  storedPin?: ExplorePin | null;
  guest?: boolean;
}

function fromAddress(address: UserAddress, source: ExploreCenterSource): ExploreCenter {
  return {
    lat: address.lat,
    lng: address.lng,
    radiusKm: DEFAULT_RADIUS_KM,
    label: address.label,
    addressId: address.id,
    source,
  };
}

/**
 * Explore center priority (US-GEO-11, US-GEO-14): URL → last used address →
 * default address → guest stored pin → San Nicolás. The addresses API always
 * wins over client storage.
 */
export function resolveExploreCenter({
  urlPin,
  addresses,
  storedPin,
  guest,
}: ResolveExploreCenterInput): ExploreCenter {
  if (urlPin) {
    return {
      lat: urlPin.lat,
      lng: urlPin.lng,
      radiusKm: urlPin.radiusKm ?? DEFAULT_RADIUS_KM,
      source: "url",
    };
  }

  const list = addresses ?? [];
  const lastUsed = list
    .filter((a) => a.lastUsedAt)
    .sort((a, b) => Date.parse(b.lastUsedAt!) - Date.parse(a.lastUsedAt!))[0];
  if (lastUsed) return fromAddress(lastUsed, "last-used");

  const byDefault = list.find((a) => a.isDefault);
  if (byDefault) return fromAddress(byDefault, "default-address");

  if (guest && storedPin) {
    return {
      lat: storedPin.lat,
      lng: storedPin.lng,
      radiusKm: storedPin.radiusKm || DEFAULT_RADIUS_KM,
      label: storedPin.formattedAddress,
      source: "stored",
    };
  }

  return {
    lat: SAN_NICOLAS_CENTER.lat,
    lng: SAN_NICOLAS_CENTER.lng,
    radiusKm: DEFAULT_RADIUS_KM,
    source: "san-nicolas",
  };
}

/** Chip: «San Nicolás» solo si el pin es el default; un pin URL no hereda esa etiqueta. */
export function exploreChipFallbackLabel(lat: number, lng: number): string {
  const nearSn =
    Math.abs(lat - SAN_NICOLAS_CENTER.lat) < 0.002 &&
    Math.abs(lng - SAN_NICOLAS_CENTER.lng) < 0.002;
  return nearSn ? "San Nicolás" : "Ubicación";
}
