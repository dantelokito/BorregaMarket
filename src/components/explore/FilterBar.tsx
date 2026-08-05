"use client";

import { FILTER_CHIPS } from "@/types";

interface FilterBarProps {
  activeFilters: string[];
  onToggle: (id: string) => void;
}

export function FilterBar({ activeFilters, onToggle }: FilterBarProps) {
  return (
    <div className="border-b border-gray-200 bg-white sticky top-[80px] z-40">
      <div className="max-w-[1760px] mx-auto px-6 py-3">
        <div className="filter-scroll flex gap-2 overflow-x-auto pb-1">
          {FILTER_CHIPS.map((chip) => {
            const active = activeFilters.includes(chip.id);
            return (
              <button
                key={chip.id}
                onClick={() => onToggle(chip.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm whitespace-nowrap transition-all ${
                  active
                    ? "bg-gray-900 text-white border-gray-900"
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
