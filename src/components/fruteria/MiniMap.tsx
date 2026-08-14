"use client";

import { useEffect, useRef } from "react";

interface MiniMapProps {
  latitude: number;
  longitude: number;
  businessName?: string;
  onLocationChange?: (lat: number, lng: number) => void;
  interactive?: boolean;
}

export function MiniMap({
  latitude,
  longitude,
  businessName,
  onLocationChange,
  interactive = false,
}: MiniMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !mapRef.current) return;

    let cancelled = false;

    async function initMap() {
      const L = (await import("leaflet")).default;

      if (cancelled || !mapRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const map = L.map(mapRef.current, {
        zoomControl: true,
        dragging: interactive,
        scrollWheelZoom: interactive,
      }).setView([latitude, longitude], 14);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      }).addTo(map);

      const marker = L.marker([latitude, longitude]).addTo(map);
      if (businessName) {
        marker.bindPopup(businessName);
      }

      if (interactive && onLocationChange) {
        map.on("click", (e: L.LeafletMouseEvent) => {
          const { lat, lng } = e.latlng;
          marker.setLatLng([lat, lng]);
          onLocationChange(lat, lng);
        });
      }

      mapInstanceRef.current = map;
      markerRef.current = marker;
    }

    initMap();

    return () => {
      cancelled = true;
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (markerRef.current && mapInstanceRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
      mapInstanceRef.current.setView([latitude, longitude]);
    }
  }, [latitude, longitude]);

  return (
    <div className="relative h-48 w-full overflow-hidden rounded-xl border border-gray-200 lg:h-64">
      <div ref={mapRef} className="absolute inset-0" />
    </div>
  );
}
