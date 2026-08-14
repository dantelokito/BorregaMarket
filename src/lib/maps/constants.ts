export const MONTERREY_CENTER = { lat: 25.6714, lng: -100.35 };
export const DEFAULT_RADIUS_KM = 10;
export const MIN_RADIUS_KM = 1;
export const MAX_RADIUS_KM = 25;
export const EXPLORE_PIN_STORAGE_KEY = "lbm.explore.pin";

export function getGoogleMapsApiKey(): string | undefined {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key || !key.trim()) return undefined;
  return key.trim();
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
