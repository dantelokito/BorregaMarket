"use client";

import { FILTER_CHIPS } from "@/types";

interface FilterBarProps {
  activeFilters: string[];
  onToggle: (id: string) => void;
}

export function FilterBar({ activeFilters, onToggle }: FilterBarProps) {
  return (
    <div className="sticky top-[80px] z-40 border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-[1760px] px-6 py-3">
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
      </div>
    </div>
  );
}
