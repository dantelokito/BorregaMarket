"use client";

import { DEFAULT_RADIUS_KM, MAX_RADIUS_KM, MIN_RADIUS_KM } from "@/lib/maps/constants";

interface RadiusSliderProps {
  value: number;
  onChange: (km: number) => void;
  disabled?: boolean;
}

export function RadiusSlider({ value, onChange, disabled }: RadiusSliderProps) {
  const km = Number.isFinite(value) ? value : DEFAULT_RADIUS_KM;
  return (
    <div className="w-full">
      <label htmlFor="radius-km" className="mb-1 block text-sm font-medium text-slate-600">
        Radio: {km} km
      </label>
      <input
        id="radius-km"
        type="range"
        min={MIN_RADIUS_KM}
        max={MAX_RADIUS_KM}
        step={1}
        value={km}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuemin={MIN_RADIUS_KM}
        aria-valuemax={MAX_RADIUS_KM}
        aria-valuenow={km}
        aria-valuetext={`${km} kilómetros`}
        className="h-11 w-full accent-[var(--brand)]"
      />
      <div className="flex justify-between text-xs text-slate-500">
        <span>{MIN_RADIUS_KM} km</span>
        <span>{MAX_RADIUS_KM} km</span>
      </div>
    </div>
  );
}
