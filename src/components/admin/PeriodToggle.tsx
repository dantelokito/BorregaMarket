"use client";

import type { AnalyticsRange } from "@/lib/api/types";

const OPTIONS: { id: AnalyticsRange; label: string }[] = [
  { id: "today", label: "Hoy" },
  { id: "7d", label: "7 días" },
  { id: "30d", label: "30 días" },
];

export function PeriodToggle({
  value,
  onChange,
}: {
  value: AnalyticsRange;
  onChange: (v: AnalyticsRange) => void;
}) {
  return (
    <div role="tablist" aria-label="Periodo" className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="tab"
          aria-selected={value === opt.id}
          onClick={() => onChange(opt.id)}
          className={`h-11 min-w-[72px] rounded-md px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--brand)] ${
            value === opt.id ? "bg-[var(--brand)] text-white" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
