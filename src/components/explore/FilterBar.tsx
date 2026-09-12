"use client";

import { ChevronDown, LocateFixed } from "lucide-react";
import type { FilterBarPhase } from "@/hooks/useFilterBarCollapse";
import { FILTER_CHIPS } from "@/types";

interface FilterBarProps {
  activeFilters: string[];
  onToggle: (id: string) => void;
  onUseMyLocation?: () => void;
  locating?: boolean;
  phase?: FilterBarPhase;
  shellCollapsed?: boolean;
  pillVisible?: boolean;
  onExpand?: () => void;
  /** Compact single-row chrome for md+ (ExploreChromeF9). */
  compact?: boolean;
}

function FilterBarExpandTab({
  activeCount,
  onExpand,
}: {
  activeCount: number;
  onExpand: () => void;
}) {
  const label =
    activeCount > 0
      ? `Mostrar chips (${activeCount} activo${activeCount === 1 ? "" : "s"})`
      : "Mostrar chips";

  return (
    <button
      type="button"
      role="button"
      aria-expanded={false}
      aria-label={label}
      onClick={onExpand}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onExpand();
        }
      }}
      className="explore-filter-tab inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
    >
      <ChevronDown size={16} aria-hidden className="rotate-180" />
      <span>Chips</span>
      {activeCount > 0 && (
        <span className="rounded-full bg-[var(--brand)] px-1.5 py-0.5 text-xs font-semibold text-white">
          {activeCount}
        </span>
      )}
    </button>
  );
}

function shellPhaseClass(phase: FilterBarPhase | undefined, shellCollapsed: boolean): string {
  const base = "explore-filterbar-shell";
  if (phase === "collapsing") return `${base} explore-filterbar-shell--collapsing explore-filterbar-shell--collapsed`;
  if (phase === "expanding") return `${base} explore-filterbar-shell--expanding`;
  if (shellCollapsed) return `${base} explore-filterbar-shell--collapsed`;
  return base;
}

export function FilterBar({
  activeFilters,
  onToggle,
  onUseMyLocation,
  locating = false,
  phase = "expanded",
  shellCollapsed = false,
  pillVisible = false,
  onExpand,
  compact = false,
}: FilterBarProps) {
  const shellClass = shellPhaseClass(phase, shellCollapsed);
  const tabRowClass = pillVisible
    ? "explore-filter-tab-row explore-filter-tab-row--visible"
    : "explore-filter-tab-row";

  const chips = (
    <div className={`filter-scroll flex gap-2 overflow-x-auto ${compact ? "pb-0" : "pb-1"}`}>
      {FILTER_CHIPS.map((chip) => {
        const active = activeFilters.includes(chip.id);
        return (
          <button
            key={chip.id}
            type="button"
            onClick={() => onToggle(chip.id)}
            aria-pressed={active}
            tabIndex={shellCollapsed ? -1 : undefined}
            className={`flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-2 text-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] ${
              active
                ? "border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]"
                : "border-gray-300 hover:border-gray-900 hover:bg-gray-50"
            }`}
          >
            <span aria-hidden>{chip.icon}</span>
            <span>{chip.label}</span>
          </button>
        );
      })}
    </div>
  );

  const gps = onUseMyLocation ? (
    <button
      type="button"
      onClick={onUseMyLocation}
      tabIndex={shellCollapsed ? -1 : undefined}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] ${
        compact ? "shrink-0" : "w-full lg:w-auto"
      }`}
    >
      <LocateFixed size={16} aria-hidden />
      {locating ? "Obteniendo ubicación…" : "Usar mi ubicación"}
    </button>
  ) : null;

  if (compact) {
    return (
      <div className="flex min-w-0 flex-1 items-center gap-2" aria-hidden={shellCollapsed}>
        {chips}
        {gps}
      </div>
    );
  }

  return (
    <div className="explore-filterbar-chrome">
      <div className={shellClass}>
        <div className="explore-filterbar-inner">
          <div className="explore-filterbar-panel bg-white" aria-hidden={shellCollapsed}>
            <div className="mx-auto max-w-[1760px] px-6 py-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                {chips}
                {gps}
              </div>
            </div>
          </div>
        </div>
      </div>

      {onExpand && (
        <div className={tabRowClass} aria-hidden={!pillVisible}>
          <FilterBarExpandTab activeCount={activeFilters.length} onExpand={onExpand} />
        </div>
      )}
    </div>
  );
}
