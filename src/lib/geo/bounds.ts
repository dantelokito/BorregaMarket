export const MONTERREY_LAT_MIN = 25.4;
export const MONTERREY_LAT_MAX = 25.9;
export const MONTERREY_LNG_MIN = -100.6;
export const MONTERREY_LNG_MAX = -99.8;

/** ADR-028 — rectángulo WGS84 México (no polígono INEGI). */
export const MEXICO_BOUNDS = {
  south: 14.5329,
  west: -118.3649,
  north: 32.7187,
  east: -86.7104,
} as const;

export function isWithinMonterreyBounds(lat: number, lng: number): boolean {
  return (
    lat >= MONTERREY_LAT_MIN &&
    lat <= MONTERREY_LAT_MAX &&
    lng >= MONTERREY_LNG_MIN &&
    lng <= MONTERREY_LNG_MAX
  );
}

export function isInMexico(lat: number, lng: number): boolean {
  return (
    lat >= MEXICO_BOUNDS.south &&
    lat <= MEXICO_BOUNDS.north &&
    lng >= MEXICO_BOUNDS.west &&
    lng <= MEXICO_BOUNDS.east
  );
}
