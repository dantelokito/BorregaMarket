"use client";

import { useEffect, useRef } from "react";
import { Map, useMap } from "@vis.gl/react-google-maps";
import { getGoogleMapsApiKey } from "@/lib/maps/constants";
import { GoogleMapsProvider } from "@/components/maps/GoogleMapsProvider";

interface MiniMapProps {
  latitude: number;
  longitude: number;
  businessName?: string;
  onLocationChange?: (lat: number, lng: number) => void;
  interactive?: boolean;
}

function MiniMapInner({
  latitude,
  longitude,
  businessName,
  onLocationChange,
  interactive = false,
}: MiniMapProps) {
  const map = useMap();
  const markerRef = useRef<google.maps.Marker | null>(null);

  useEffect(() => {
    if (!map) return;
    const position = { lat: latitude, lng: longitude };

    if (!markerRef.current) {
      markerRef.current = new google.maps.Marker({
        map,
        position,
        title: businessName,
        draggable: interactive,
      });
      if (interactive && onLocationChange) {
        markerRef.current.addListener("dragend", () => {
          const pos = markerRef.current?.getPosition();
          if (pos) onLocationChange(pos.lat(), pos.lng());
        });
        map.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          markerRef.current?.setPosition(e.latLng);
          onLocationChange(e.latLng.lat(), e.latLng.lng());
        });
      }
    } else {
      markerRef.current.setPosition(position);
    }
    map.panTo(position);
  }, [map, latitude, longitude, businessName, interactive, onLocationChange]);

  return null;
}

export function MiniMap(props: MiniMapProps) {
  const apiKey = getGoogleMapsApiKey();

  if (!apiKey) {
    return (
      <div
        className="flex h-48 w-full items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-slate-50 text-sm text-slate-500 lg:h-64"
        role="status"
      >
        Mapa no disponible
      </div>
    );
  }

  return (
    <GoogleMapsProvider>
      <div className="relative h-48 w-full overflow-hidden rounded-xl border border-gray-200 lg:h-64">
        <Map
          className="absolute inset-0 h-full w-full"
          defaultCenter={{ lat: props.latitude, lng: props.longitude }}
          defaultZoom={14}
          gestureHandling={props.interactive ? "greedy" : "none"}
          disableDefaultUI={!props.interactive}
          reuseMaps
          mapId="DEMO_MAP_ID"
        >
          <MiniMapInner {...props} />
        </Map>
      </div>
    </GoogleMapsProvider>
  );
}
