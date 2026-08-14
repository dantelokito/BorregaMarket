"use client";

import type { UnitOfMeasure } from "@/lib/api/types";

const UNITS: { value: UnitOfMeasure; label: string }[] = [
  { value: "PZA", label: "PZA" },
  { value: "KG", label: "KG" },
  { value: "GR", label: "GR" },
];

interface UnitSelectorProps {
  value: UnitOfMeasure;
  onChange: (value: UnitOfMeasure) => void;
  priceHint?: string;
}

export function UnitSelector({ value, onChange, priceHint }: UnitSelectorProps) {
  return (
    <div>
      <div role="radiogroup" aria-label="Unidad de medida" className="inline-flex rounded-lg border border-gray-300">
        {UNITS.map((u) => (
          <button
            key={u.value}
            type="button"
            role="radio"
            aria-checked={value === u.value}
            onClick={() => onChange(u.value)}
            className={`min-h-12 min-w-16 px-3 text-sm font-semibold ${
              value === u.value
                ? "bg-[var(--brand)] text-white"
                : "bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {u.label}
          </button>
        ))}
      </div>
      {priceHint && <p className="mt-1 text-xs text-slate-500">{priceHint}</p>}
    </div>
  );
}
