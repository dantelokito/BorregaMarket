export const MONTERREY_CENTER = { lat: 25.6714, lng: -100.35 };
/** Default explore center: San Nicolás de los Garza (ADR-026). */
export const SAN_NICOLAS_CENTER = { lat: 25.7475, lng: -100.283 };
/** CO-F8-001: mismo clamp FE/BE. Prohibido Math.round (rompe 0.5). */
export const DEFAULT_RADIUS_KM = 10;
export const MIN_RADIUS_KM = 0.5;
export const MAX_RADIUS_KM = 10;
export const RADIUS_STEP_KM = 0.5;
export const EXPLORE_PIN_STORAGE_KEY = "lbm.explore.pin";
export const DEFAULT_OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
export const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
export const MONTERREY_VIEWBOX = "-100.6,25.9,-99.8,25.4";
/** ADR-028 / CO-F8-002 — Nominatim viewbox México (west,north,east,south). */
export const MEXICO_VIEWBOX = "-118.3649,32.7187,-86.7104,14.5329";
/** Leaflet maxBounds: [[south, west], [north, east]]. */
export const MEXICO_MAP_BOUNDS: [[number, number], [number, number]] = [
  [14.5329, -118.3649],
  [32.7187, -86.7104],
];

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
