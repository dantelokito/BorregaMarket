"use client";

import { LocateFixed } from "lucide-react";
import { FILTER_CHIPS } from "@/types";

interface FilterBarProps {
  activeFilters: string[];
  onToggle: (id: string) => void;
  onUseMyLocation?: () => void;
  locating?: boolean;
}

export function FilterBar({
  activeFilters,
  onToggle,
  onUseMyLocation,
  locating = false,
}: FilterBarProps) {
  return (
    <div className="sticky top-[80px] z-40 border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-[1760px] px-6 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="filter-scroll flex gap-2 overflow-x-auto pb-1">
            {FILTER_CHIPS.map((chip) => {
              const active = activeFilters.includes(chip.id);
              const disabled = "disabled" in chip && chip.disabled;
              return (
                <button
                  key={chip.id}
                  onClick={() => !disabled && onToggle(chip.id)}
                  disabled={disabled}
                  aria-pressed={active}
                  className={`flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[var(--brand)] ${
                    disabled
                      ? "cursor-not-allowed border-gray-200 text-gray-400 opacity-60"
                      : active
                        ? "border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]"
                        : "border-gray-300 hover:border-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <span>{chip.icon}</span>
                  <span>{chip.label}</span>
                </button>
              );
            })}
          </div>
          {onUseMyLocation && (
            <button
              type="button"
              onClick={onUseMyLocation}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] lg:w-auto"
            >
              <LocateFixed size={16} aria-hidden />
              {locating ? "Obteniendo ubicación…" : "Usar mi ubicación"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
