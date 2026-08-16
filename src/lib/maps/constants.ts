export const MONTERREY_CENTER = { lat: 25.6714, lng: -100.35 };
export const DEFAULT_RADIUS_KM = 10;
export const MIN_RADIUS_KM = 1;
export const MAX_RADIUS_KM = 25;
export const EXPLORE_PIN_STORAGE_KEY = "lbm.explore.pin";
export const DEFAULT_OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
export const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
export const MONTERREY_VIEWBOX = "-100.6,25.9,-99.8,25.4";

export function getOsmTileUrl(): string {
  const url = process.env.NEXT_PUBLIC_OSM_TILE_URL;
  if (!url || !url.trim()) return DEFAULT_OSM_TILE_URL;
  return url.trim();
}

export interface ExplorePin {
  lat: number;
  lng: number;
  formattedAddress?: string;
  radiusKm: number;
}

export function readExplorePin(): ExplorePin | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(EXPLORE_PIN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ExplorePin;
    if (typeof parsed.lat !== "number" || typeof parsed.lng !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeExplorePin(pin: ExplorePin): void {
  sessionStorage.setItem(EXPLORE_PIN_STORAGE_KEY, JSON.stringify(pin));
}

export function clearExplorePin(): void {
  sessionStorage.removeItem(EXPLORE_PIN_STORAGE_KEY);
}
