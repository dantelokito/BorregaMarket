"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  AttributionControl,
  Circle,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import type { ProviderListing } from "@/lib/api/types";
import {
  getOsmTileUrl,
  MONTERREY_CENTER,
  OSM_ATTRIBUTION,
} from "@/lib/maps/constants";
import "leaflet/dist/leaflet.css";

export interface MapBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

interface ExploreMapProps {
  providers: ProviderListing[];
  hoveredId: string | null;
  onMarkerHover: (id: string) => void;
  onMarkerLeave: () => void;
  pin?: { lat: number; lng: number } | null;
  radiusKm?: number;
  onPinChange?: (lat: number, lng: number) => void;
  onTilesError?: (down: boolean) => void;
  onViewportChange?: (bounds: MapBounds) => void;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function priceIcon(label: string, active: boolean): L.DivIcon {
  return L.divIcon({
    className: "lbm-price-icon",
    html: `<div class="price-bubble${active ? " active" : ""}">${escapeHtml(label)}</div>`,
    iconSize: [1, 1],
    iconAnchor: [20, 12],
  });
}

function userPinIcon(): L.DivIcon {
  return L.divIcon({
    className: "lbm-user-pin",
    html: '<div class="h-4 w-4 rounded-full border-2 border-white bg-[var(--brand)] shadow"></div>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.panTo([lat, lng]);
  }, [map, lat, lng]);
  return null;
}

function ViewportReporter({ onViewportChange }: { onViewportChange?: (bounds: MapBounds) => void }) {
  const map = useMap();

  useMapEvents({
    moveend() {
      const b = map.getBounds();
      onViewportChange?.({
        south: b.getSouth(),
        west: b.getWest(),
        north: b.getNorth(),
        east: b.getEast(),
      });
    },
    zoomend() {
      const b = map.getBounds();
      onViewportChange?.({
        south: b.getSouth(),
        west: b.getWest(),
        north: b.getNorth(),
        east: b.getEast(),
      });
    },
  });

  return null;
}

function TileStatus({ onTilesError }: { onTilesError?: (down: boolean) => void }) {
  const failed = useRef(0);
  const loaded = useRef(0);

  return (
    <TileLayer
      attribution={OSM_ATTRIBUTION}
      url={getOsmTileUrl()}
      eventHandlers={{
        tileerror: () => {
          failed.current += 1;
          if (loaded.current === 0 && failed.current >= 3) {
            onTilesError?.(true);
          }
        },
        tileload: () => {
          loaded.current += 1;
          if (loaded.current > 0) onTilesError?.(false);
        },
      }}
    />
  );
}

export function ExploreMap({
  providers,
  hoveredId,
  onMarkerHover,
  onMarkerLeave,
  pin,
  radiusKm = 10,
  onPinChange,
  onTilesError,
  onViewportChange,
}: ExploreMapProps) {
  const center = pin ?? MONTERREY_CENTER;
  const brandStroke = useMemo(() => {
    if (typeof window === "undefined") return "#e23744";
    return getComputedStyle(document.documentElement).getPropertyValue("--brand").trim() || "#e23744";
  }, []);

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={12}
      className="h-full w-full"
      scrollWheelZoom
      attributionControl={false}
    >
      <AttributionControl position="topright" prefix={false} />
      <TileStatus onTilesError={onTilesError} />
      <Recenter lat={center.lat} lng={center.lng} />
      <ViewportReporter onViewportChange={onViewportChange} />
      {pin && (
        <>
          <Circle
            center={[pin.lat, pin.lng]}
            radius={radiusKm * 1000}
            pathOptions={{
              color: brandStroke,
              weight: 2,
              opacity: 0.6,
              fillColor: brandStroke,
              fillOpacity: 0.08,
            }}
          />
          <Marker
            position={[pin.lat, pin.lng]}
            draggable={Boolean(onPinChange)}
            icon={userPinIcon()}
            zIndexOffset={1000}
            title="Tu ubicación"
            eventHandlers={{
              dragend: (e) => {
                const pos = (e.target as L.Marker).getLatLng();
                onPinChange?.(pos.lat, pos.lng);
              },
            }}
          />
        </>
      )}
      {providers.map((p) => {
        const active = hoveredId === p.id;
        const label = p.minPrice ? `$${p.minPrice.toLocaleString("es-MX")}` : p.businessName;
        return (
          <Marker
            key={p.id}
            position={[p.latitude, p.longitude]}
            icon={priceIcon(label, active)}
            title={`${p.businessName}${p.minPrice ? ` · ${label}` : ""}`}
            eventHandlers={{
              mouseover: () => onMarkerHover(p.id),
              mouseout: () => onMarkerLeave(),
            }}
          />
        );
      })}
    </MapContainer>
  );
}
