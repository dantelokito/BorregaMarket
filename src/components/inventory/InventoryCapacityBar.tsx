"use client";

import {
  capacityBarWidth,
  fillAriaText,
  formatFillPercent,
  isOverCapacity,
} from "@/lib/inventory/capacity";

export function InventoryCapacityBar({
  fillPercent,
  compact = false,
}: {
  fillPercent: number | null | undefined;
  compact?: boolean;
}) {
  const label = formatFillPercent(fillPercent);
  const over = isOverCapacity(fillPercent);
  const width = capacityBarWidth(fillPercent);
  const noCap = fillPercent == null;

  return (
    <div className={compact ? "min-w-[80px]" : "w-full min-w-[120px]"}>
      <div
        role="progressbar"
        aria-valuenow={noCap ? undefined : Math.round(fillPercent ?? 0)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={fillAriaText(fillPercent)}
        className={`overflow-hidden rounded-full bg-slate-200 ${compact ? "h-2" : "h-2.5"}`}
      >
        <div
          className={`h-full rounded-full ${
            noCap ? "bg-slate-300" : over ? "bg-amber-500" : "bg-[var(--brand)]"
          }`}
          style={{ width: noCap ? "0%" : `${width}%` }}
        />
      </div>
      <p
        className={`mt-1 text-xs tabular-nums ${
          over ? "font-medium text-amber-700" : "text-slate-600"
        }`}
      >
        {noCap ? "Sin tope" : label}
        {over ? " · Sobre tope" : ""}
      </p>
    </div>
  );
}
