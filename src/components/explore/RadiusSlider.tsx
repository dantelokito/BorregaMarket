"use client";

import { DEFAULT_RADIUS_KM, MAX_RADIUS_KM, MIN_RADIUS_KM, RADIUS_STEP_KM } from "@/lib/maps/constants";
import { formatRadius } from "@/lib/maps/format-radius";

interface RadiusSliderProps {
  value: number;
  onChange: (km: number) => void;
  disabled?: boolean;
}

export function RadiusSlider({ value, onChange, disabled }: RadiusSliderProps) {
  const km = Number.isFinite(value) ? value : DEFAULT_RADIUS_KM;
  const label = formatRadius(km);

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="radius-km" className="shrink-0 text-sm font-medium text-slate-700">
        Radio: {label}
      </label>
      <span className="hidden shrink-0 text-xs text-slate-500 sm:inline">500 m</span>
      <input
        id="radius-km"
        type="range"
        min={MIN_RADIUS_KM}
        max={MAX_RADIUS_KM}
        step={RADIUS_STEP_KM}
        value={km}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuemin={MIN_RADIUS_KM}
        aria-valuemax={MAX_RADIUS_KM}
        aria-valuenow={km}
        aria-valuetext={label}
        className="h-11 min-w-0 flex-1 accent-[var(--brand)]"
      />
      <span className="shrink-0 text-xs text-slate-500">10 km</span>
    </div>
  );
}
