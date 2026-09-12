"use client";

import type { KeyboardEvent } from "react";
import type { DashboardView } from "@/lib/reports/period";

const TABS: { id: DashboardView; label: string }[] = [
  { id: "resumen", label: "Resumen" },
  { id: "reportes", label: "Reportes" },
];

export function DashboardViewSwitcher({
  view,
  onChange,
}: {
  view: DashboardView;
  onChange: (view: DashboardView) => void;
}) {
  function onKeyDown(event: KeyboardEvent) {
    const index = TABS.findIndex((tab) => tab.id === view);
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const delta = event.key === "ArrowRight" ? 1 : -1;
      const next = TABS[(index + delta + TABS.length) % TABS.length];
      onChange(next.id);
    }
  }

  return (
    <div
      role="tablist"
      aria-label="Vista del dashboard"
      className="no-print mb-6 flex w-full border-b border-gray-200"
      onKeyDown={onKeyDown}
    >
      {TABS.map((tab) => {
        const selected = view === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={`min-h-11 flex-1 px-4 text-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:ring-offset-2 sm:flex-none ${
              selected
                ? "border-b-2 border-[var(--brand)] font-medium text-[var(--brand)]"
                : "border-b-2 border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
