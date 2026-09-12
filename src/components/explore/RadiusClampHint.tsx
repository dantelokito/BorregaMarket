"use client";

import { Info } from "lucide-react";

export function RadiusClampHint({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <p
      role="status"
      className="mb-2 inline-flex items-center gap-1 rounded-md bg-white/95 px-2 py-1 text-sm text-slate-600"
    >
      <Info size={14} aria-hidden />
      Máximo 25 km
    </p>
  );
}
