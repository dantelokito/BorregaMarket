const GOOGLE_HOSTS = new Set([
  "google.com",
  "www.google.com",
  "maps.google.com",
  "maps.app.goo.gl",
]);

export function isValidGooglePlaceId(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length >= 10 && trimmed.length <= 255;
}

export function isValidGoogleMapsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    if (GOOGLE_HOSTS.has(host)) return true;
    return host.endsWith(".google.com");
  } catch {
    return false;
  }
}

export function googleReviewsGate(provider: {
  isVerified: boolean;
  googleReviewsEnabled: boolean;
  googlePlaceId: string | null;
  googleMapsUrl: string | null;
}): { enabled: boolean; placeId: string | null; mapsUrl: string | null } {
  const hasId = Boolean(provider.googlePlaceId || provider.googleMapsUrl);
  const enabled =
    provider.isVerified && provider.googleReviewsEnabled && hasId;
  if (!enabled) {
    return { enabled: false, placeId: null, mapsUrl: null };
  }
  return {
    enabled: true,
    placeId: provider.googlePlaceId,
    mapsUrl: provider.googleMapsUrl,
  };
}
