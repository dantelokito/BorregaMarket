"use client";

import { ChevronDown, MapPin } from "lucide-react";

interface LocationChipProps {
  label: string;
  expanded: boolean;
  onToggle: () => void;
}

export function LocationChip({ label, expanded, onToggle }: LocationChipProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-haspopup="dialog"
      className={`inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border bg-white px-3 text-left text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] ${
        expanded ? "border-[var(--brand)] ring-2 ring-[var(--brand)]" : "border-gray-300"
      }`}
    >
      <MapPin size={16} className="shrink-0 text-[var(--brand)]" aria-hidden />
      <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
      <ChevronDown
        size={16}
        aria-hidden
        className={`shrink-0 text-slate-500 transition-transform duration-150 ${expanded ? "rotate-180" : ""}`}
      />
    </button>
  );
}
