"use client";

import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { getOsmTileUrl, OSM_ATTRIBUTION } from "@/lib/maps/constants";
import "leaflet/dist/leaflet.css";

interface MiniMapInnerProps {
  latitude: number;
  longitude: number;
  businessName?: string;
  onLocationChange?: (lat: number, lng: number) => void;
  interactive?: boolean;
}

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng]);
  }, [map, lat, lng]);
  return null;
}

function ClickToMove({
  enabled,
  onLocationChange,
}: {
  enabled: boolean;
  onLocationChange?: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (enabled && onLocationChange) onLocationChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function pinIcon(title?: string): L.DivIcon {
  return L.divIcon({
    className: "lbm-mini-pin",
    html: `<div class="h-4 w-4 rounded-full border-2 border-white bg-[var(--brand)] shadow" title="${title ?? ""}"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

export function MiniMapInner({
  latitude,
  longitude,
  businessName,
  onLocationChange,
  interactive = false,
}: MiniMapInnerProps) {
  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={14}
      className="h-full w-full"
      scrollWheelZoom={interactive}
      dragging={interactive}
      doubleClickZoom={interactive}
      zoomControl={interactive}
      attributionControl
    >
      <TileLayer attribution={OSM_ATTRIBUTION} url={getOsmTileUrl()} />
      <Recenter lat={latitude} lng={longitude} />
      <ClickToMove enabled={interactive} onLocationChange={onLocationChange} />
      <Marker
        position={[latitude, longitude]}
        draggable={interactive}
        icon={pinIcon(businessName)}
        title={businessName}
        eventHandlers={{
          dragend: (e) => {
            if (!onLocationChange) return;
            const pos = (e.target as L.Marker).getLatLng();
            onLocationChange(pos.lat, pos.lng);
          },
        }}
      />
    </MapContainer>
  );
}
