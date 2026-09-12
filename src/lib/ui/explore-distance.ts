import { computeEtaMinutes } from "@/lib/geo/eta";

const WALK_SPEED_KMH = 5;
const WALK_PREF_MAX_MIN = 15;

/** Copy Must F9 — distancia desde el pin de búsqueda. */
export function formatSearchDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    const meters = Math.max(1, Math.round(distanceKm * 1000));
    return `A ${meters} m de tu búsqueda`;
  }
  const rounded = Math.round(distanceKm * 10) / 10;
  const label = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `A ${label} km de tu búsqueda`;
}

/**
 * ETA de card (US-EXPLORE-10): preferir pie si caminata 5 km/h &lt; 15 min;
 * si no, auto ADR-017 (solo viaje, sin prep en listing).
 */
export function formatCardEta(distanceKm: number): string {
  const walkMinutes = Math.max(1, Math.round((distanceKm / WALK_SPEED_KMH) * 60));
  if (walkMinutes < WALK_PREF_MAX_MIN) {
    return `~${walkMinutes} min a pie`;
  }
  const { travelMinutes } = computeEtaMinutes({
    preparationTimeMinutes: 0,
    distanceKm,
  });
  return `~${travelMinutes} min en auto`;
}

/** Ratio 0–1 para barra Should (`distanceKm / radiusKm`). */
export function distanceRatio(distanceKm: number, radiusKm: number): number {
  if (!(radiusKm > 0) || !(distanceKm >= 0)) return 0;
  return Math.min(1, distanceKm / radiusKm);
}
