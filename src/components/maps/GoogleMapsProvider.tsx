"use client";

import { APIProvider } from "@vis.gl/react-google-maps";
import type { ReactNode } from "react";
import { getGoogleMapsApiKey } from "@/lib/maps/constants";

export function GoogleMapsProvider({ children }: { children: ReactNode }) {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) return <>{children}</>;
  return <APIProvider apiKey={apiKey}>{children}</APIProvider>;
}

export function mapsAvailable(): boolean {
  return Boolean(getGoogleMapsApiKey());
}
