export const MONTERREY_LAT_MIN = 25.4;
export const MONTERREY_LAT_MAX = 25.9;
export const MONTERREY_LNG_MIN = -100.6;
export const MONTERREY_LNG_MAX = -99.8;

export function isWithinMonterreyBounds(lat: number, lng: number): boolean {
  return (
    lat >= MONTERREY_LAT_MIN &&
    lat <= MONTERREY_LAT_MAX &&
    lng >= MONTERREY_LNG_MIN &&
    lng <= MONTERREY_LNG_MAX
  );
}
