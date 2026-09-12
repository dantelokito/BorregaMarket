"use client";

import type { ReportGrain } from "@/lib/api/types";

const GRAINS: { id: ReportGrain; label: string }[] = [
  { id: "day", label: "Día" },
  { id: "month", label: "Mes" },
  { id: "year", label: "Año" },
];

export function GrainSelector({
  value,
  onChange,
}: {
  value: ReportGrain;
  onChange: (grain: ReportGrain) => void;
}) {
  return (
    <div className="flex w-full overflow-hidden rounded-lg border border-gray-300" role="group" aria-label="Grano del reporte">
      {GRAINS.map((grain) => {
        const pressed = value === grain.id;
        return (
          <button
            key={grain.id}
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(grain.id)}
            className={`min-h-11 flex-1 px-3 text-sm font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:ring-inset motion-reduce:transition-none ${
              pressed
                ? "bg-[var(--brand)] text-white"
                : "bg-white text-slate-700 hover:bg-gray-50"
            }`}
          >
            {grain.label}
          </button>
        );
      })}
    </div>
  );
}
