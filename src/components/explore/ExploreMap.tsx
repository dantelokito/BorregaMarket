"use client";

import { useEffect, useRef } from "react";
import type { ProviderListing } from "@/types";

interface ExploreMapProps {
  providers: ProviderListing[];
  hoveredId: string | null;
  onMarkerHover: (id: string) => void;
  onMarkerLeave: () => void;
}

export function ExploreMap({ providers, hoveredId, onMarkerHover, onMarkerLeave }: ExploreMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (typeof window === "undefined" || !mapRef.current) return;

    let cancelled = false;

    async function initMap() {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      if (cancelled || !mapRef.current || mapInstanceRef.current) return;

      const center: [number, number] = [25.6714, -100.35];
      const map = L.map(mapRef.current, { zoomControl: true }).setView(center, 12);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      }).addTo(map);

      mapInstanceRef.current = map;
      updateMarkers(L, map);
    }

    initMap();

    return () => {
      cancelled = true;
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    import("leaflet").then(({ default: L }) => {
      updateMarkers(L, mapInstanceRef.current!);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providers, hoveredId]);

  function updateMarkers(L: typeof import("leaflet"), map: L.Map) {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    providers.forEach((p) => {
      if (!p.minPrice) return;

      const isActive = hoveredId === p.id;
      const price = `$${p.minPrice.toLocaleString("es-MX")}`;

      const icon = L.divIcon({
        className: "",
        html: `<div class="price-bubble ${isActive ? "active" : ""}">${price}</div>`,
        iconSize: [80, 30],
        iconAnchor: [40, 15],
      });

      const marker = L.marker([p.latitude, p.longitude], { icon })
        .addTo(map)
        .on("mouseover", () => onMarkerHover(p.id))
        .on("mouseout", () => onMarkerLeave());

      markersRef.current.push(marker);
    });
  }

  return (
    <div className="relative w-full h-full min-h-[400px] lg:min-h-0">
      <div ref={mapRef} className="absolute inset-0 rounded-none lg:rounded-none" />
    </div>
  );
}
