"use client";

import { useEffect, useRef } from "react";
import { Map, useMap } from "@vis.gl/react-google-maps";
import type { ProviderListing } from "@/lib/api/types";
import { MONTERREY_CENTER, getGoogleMapsApiKey } from "@/lib/maps/constants";
import { GoogleMapsProvider } from "@/components/maps/GoogleMapsProvider";

interface ExploreMapProps {
  providers: ProviderListing[];
  hoveredId: string | null;
  onMarkerHover: (id: string) => void;
  onMarkerLeave: () => void;
  pin?: { lat: number; lng: number } | null;
  radiusKm?: number;
  onPinChange?: (lat: number, lng: number) => void;
}

function MapOverlays({
  providers,
  hoveredId,
  onMarkerHover,
  onMarkerLeave,
  pin,
  radiusKm = 10,
  onPinChange,
}: ExploreMapProps) {
  const map = useMap();
  const circleRef = useRef<google.maps.Circle | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);

  useEffect(() => {
    if (!map) return;

    if (pin) {
      if (!circleRef.current) {
        circleRef.current = new google.maps.Circle({
          map,
          strokeColor: "#e23744",
          strokeOpacity: 0.6,
          strokeWeight: 2,
          fillColor: "#e23744",
          fillOpacity: 0.08,
        });
      }
      circleRef.current.setCenter(pin);
      circleRef.current.setRadius(radiusKm * 1000);
      map.panTo(pin);
    } else {
      circleRef.current?.setMap(null);
      circleRef.current = null;
    }
  }, [map, pin, radiusKm]);

  useEffect(() => {
    if (!map) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    providers.forEach((p) => {
      const isActive = hoveredId === p.id;
      const label = p.minPrice ? `$${p.minPrice.toLocaleString("es-MX")}` : p.businessName;
      const marker = new google.maps.Marker({
        map,
        position: { lat: p.latitude, lng: p.longitude },
        title: `${p.businessName}${p.minPrice ? ` · ${label}` : ""}`,
        label: {
          text: label,
          color: isActive ? "#ffffff" : "#111827",
          fontSize: "12px",
          fontWeight: "600",
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 18,
          fillColor: isActive ? "#222222" : "#ffffff",
          fillOpacity: 1,
          strokeColor: isActive ? "#222222" : "#dddddd",
          strokeWeight: 1,
        },
      });
      marker.addListener("mouseover", () => onMarkerHover(p.id));
      marker.addListener("mouseout", () => onMarkerLeave());
      markersRef.current.push(marker);
    });

    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
    };
  }, [map, providers, hoveredId, onMarkerHover, onMarkerLeave]);

  useEffect(() => {
    if (!map) return;
    if (!pin) {
      userMarkerRef.current?.setMap(null);
      userMarkerRef.current = null;
      return;
    }
    if (!userMarkerRef.current) {
      userMarkerRef.current = new google.maps.Marker({
        map,
        position: pin,
        draggable: Boolean(onPinChange),
        title: "Tu ubicación",
        zIndex: 1000,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#e23744",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      });
      if (onPinChange) {
        userMarkerRef.current.addListener("dragend", () => {
          const pos = userMarkerRef.current?.getPosition();
          if (pos) onPinChange(pos.lat(), pos.lng());
        });
      }
    } else {
      userMarkerRef.current.setPosition(pin);
    }
  }, [map, pin, onPinChange]);

  return null;
}

export function ExploreMap(props: ExploreMapProps) {
  const apiKey = getGoogleMapsApiKey();

  if (!apiKey) {
    return (
      <div
        className="flex h-full min-h-[300px] items-center justify-center rounded-xl bg-slate-100 px-4 text-center text-sm text-slate-600"
        role="status"
      >
        Mapa no disponible
      </div>
    );
  }

  const center = props.pin ?? MONTERREY_CENTER;

  return (
    <GoogleMapsProvider>
      <div className="relative h-full min-h-[300px] w-full lg:min-h-0">
        <Map
          className="absolute inset-0 h-full w-full"
          defaultCenter={center}
          defaultZoom={12}
          gestureHandling="greedy"
          disableDefaultUI={false}
          reuseMaps
          mapId="DEMO_MAP_ID"
        >
          <MapOverlays {...props} />
        </Map>
      </div>
    </GoogleMapsProvider>
  );
}
