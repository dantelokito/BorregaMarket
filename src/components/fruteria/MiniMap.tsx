"use client";

import dynamic from "next/dynamic";

interface MiniMapProps {
  latitude: number;
  longitude: number;
  businessName?: string;
  onLocationChange?: (lat: number, lng: number) => void;
  interactive?: boolean;
}

const MiniMapInner = dynamic(
  () => import("./MiniMapInner").then((m) => m.MiniMapInner),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-48 w-full animate-pulse rounded-xl bg-gray-200 lg:h-64"
        aria-busy="true"
      />
    ),
  }
);

export function MiniMap(props: MiniMapProps) {
  return (
    <div className="relative h-48 w-full overflow-hidden rounded-xl border border-gray-200 lg:h-64">
      <MiniMapInner {...props} />
    </div>
  );
}
