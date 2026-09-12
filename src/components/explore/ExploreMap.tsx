"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  AttributionControl,
  Circle,
  MapContainer,
  Marker,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import type { ProviderListing } from "@/lib/api/types";
import { isInMexico } from "@/lib/geo/bounds";
import {
  getOsmTileUrl,
  MEXICO_MAP_BOUNDS,
  OSM_ATTRIBUTION,
  SAN_NICOLAS_CENTER,
} from "@/lib/maps/constants";
import { prefersReducedMotion } from "@/lib/maps/preview-delays";
import "leaflet/dist/leaflet.css";

interface ExploreMapProps {
  providers: ProviderListing[];
  hoveredId: string | null;
  onMarkerHover: (id: string) => void;
  onMarkerLeave: () => void;
  onMarkerSelect?: (id: string) => void;
  pin?: { lat: number; lng: number } | null;
  radiusKm?: number;
  onPinChange?: (lat: number, lng: number) => void;
  /** Pin dropped outside MEXICO_BOUNDS — marker snaps back; FE does not GET. */
  onOutOfMexico?: () => void;
  onTilesError?: (down: boolean) => void;
  /** Increment to fitBounds the coverage circle (slider / GPS / address → map). */
  fitToken?: number;
}

const STORE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/></svg>`;

/** Business marker: 28px store icon, no permanent label (US-GEO-15). */
function storeIcon(active: boolean, ariaLabel: string): L.DivIcon {
  return L.divIcon({
    className: "lbm-store-icon",
    html: `<span class="store-pin${active ? " active" : ""}" role="img" aria-label="${escapeHtml(ariaLabel)}">${STORE_SVG}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function markerAriaLabel(provider: ProviderListing): string {
  if (typeof provider.distanceKm === "number") {
    return `${provider.businessName}, a ${provider.distanceKm.toFixed(1)} km`;
  }
  return provider.businessName;
}

function userPinIcon(): L.DivIcon {
  return L.divIcon({
    className: "lbm-user-pin",
    html: '<div class="h-4 w-4 rounded-full border-2 border-white bg-[var(--brand)] shadow"></div>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

/** Preserve main scroll when Leaflet receives focus or zoom (BUG-011). */
function MapFocusGuard() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    container.setAttribute("tabindex", "-1");

    const preserveScroll = () => {
      const mainScroll = document.querySelector<HTMLElement>(".explore-main-scroll");
      const scrollTop = mainScroll?.scrollTop ?? window.scrollY;
      requestAnimationFrame(() => {
        if (mainScroll) mainScroll.scrollTop = scrollTop;
        else window.scrollTo(0, scrollTop);
      });
    };

    container.addEventListener("focus", preserveScroll);
    map.on("zoomstart", preserveScroll);
    return () => {
      container.removeEventListener("focus", preserveScroll);
      map.off("zoomstart", preserveScroll);
    };
  }, [map]);
  return null;
}

/**
 * Fit map to the Haversine circle when pin or radiusKm change (GPS / slider /
 * address / favorite). Pan/zoom of the viewport alone do not change those
 * props, so the map stays free (CO-F7-001 / ID001-ID004).
 */
function FitCircle({
  pin,
  radiusKm,
  token,
}: {
  pin: { lat: number; lng: number } | null;
  radiusKm: number;
  token: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (!pin) return;
    map.whenReady(() => {
      if (map.getSize().x === 0 || map.getSize().y === 0) map.invalidateSize();
      const bounds = L.latLng(pin.lat, pin.lng).toBounds(radiusKm * 1000);
      map.fitBounds(bounds, { padding: [28, 28], animate: !prefersReducedMotion() });
    });
  }, [map, pin?.lat, pin?.lng, radiusKm, token]);
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
  onMarkerSelect,
  pin,
  radiusKm = 10,
  onPinChange,
  onOutOfMexico,
  onTilesError,
  fitToken = 0,
}: ExploreMapProps) {
  // ADR-026: fallback is San Nicolás, never Monterrey (avoids Recenter flash).
  const center = pin ?? SAN_NICOLAS_CENTER;
  const brandStroke = useMemo(() => {
    if (typeof window === "undefined") return "#e23744";
    return getComputedStyle(document.documentElement).getPropertyValue("--brand").trim() || "#e23744";
  }, []);

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={12}
      minZoom={5}
      maxBounds={MEXICO_MAP_BOUNDS}
      maxBoundsViscosity={1}
      className="h-full w-full"
      scrollWheelZoom
      attributionControl={false}
    >
      <AttributionControl position="topright" prefix={false} />
      <TileStatus onTilesError={onTilesError} />
      <MapFocusGuard />
      <FitCircle pin={pin ?? null} radiusKm={radiusKm} token={fitToken} />
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
                const marker = e.target as L.Marker;
                const pos = marker.getLatLng();
                if (!isInMexico(pos.lat, pos.lng)) {
                  marker.setLatLng([pin.lat, pin.lng]);
                  onOutOfMexico?.();
                  return;
                }
                onPinChange?.(pos.lat, pos.lng);
              },
            }}
          />
        </>
      )}
      {providers.map((p) => {
        const active = hoveredId === p.id;
        return (
          <Marker
            key={p.id}
            position={[p.latitude, p.longitude]}
            icon={storeIcon(active, markerAriaLabel(p))}
            keyboard
            eventHandlers={{
              mouseover: () => onMarkerHover(p.id),
              mouseout: () => onMarkerLeave(),
              click: () => {
                onMarkerHover(p.id);
                onMarkerSelect?.(p.id);
              },
            }}
          >
            <Tooltip direction="top" offset={[0, -14]} opacity={1} className="lbm-marker-tooltip">
              {p.businessName}
            </Tooltip>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
