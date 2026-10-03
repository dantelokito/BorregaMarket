"use client";

import Link from "next/link";
import { useMeasurement } from "./MeasurementProvider";

export function PreferencesLink({ className }: { className?: string }) {
  const { openPreferences } = useMeasurement();
  return (
    <Link
      href="/legal/cookies#preferencias"
      className={className}
      onClick={(e) => {
        e.preventDefault();
        openPreferences();
      }}
    >
      Preferencias de medición
    </Link>
  );
}
