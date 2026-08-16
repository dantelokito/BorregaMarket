import { MONTERREY_VIEWBOX } from "./constants";

export interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

export function buildNominatimSearchUrl(query: string): string {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "mx");
  url.searchParams.set("viewbox", MONTERREY_VIEWBOX);
  url.searchParams.set("bounded", "1");
  return url.toString();
}

export async function geocodeAddress(query: string): Promise<GeocodeResult> {
  const res = await fetch(buildNominatimSearchUrl(query), {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error("geocode failed");
  }
  const data = (await res.json()) as { lat: string; lon: string; display_name: string }[];
  const first = data[0];
  if (!first) {
    throw new Error("not found");
  }
  const lat = Number(first.lat);
  const lng = Number(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("not found");
  }
  return { lat, lng, formattedAddress: first.display_name };
}
