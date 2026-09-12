"use client";

import { Info } from "lucide-react";

const COPY = "Esa ubicación está fuera de México. Seguimos donde estabas.";

export function OutOfMexicoBanner({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <p
      role="status"
      className="inline-flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900"
    >
      <Info size={16} className="mt-0.5 shrink-0" aria-hidden />
      {COPY}
    </p>
  );
}
