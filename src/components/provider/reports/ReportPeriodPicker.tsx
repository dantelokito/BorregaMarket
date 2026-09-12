"use client";

import type { ReportGrain } from "@/lib/api/types";
import { isReportPeriodInFuture } from "@/lib/timezone";
import { maxDateForGrain, yearOptions } from "@/lib/reports/period";

const FUTURE_COPY = "Elige un periodo que no sea futuro";

export function ReportPeriodPicker({
  grain,
  value,
  onChange,
}: {
  grain: ReportGrain;
  value: string;
  onChange: (date: string) => void;
}) {
  const max = maxDateForGrain(grain);
  const future = isReportPeriodInFuture(grain, value);
  const id = "report-period";

  return (
    <div className="w-full">
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
        Periodo
      </label>
      {grain === "day" && (
        <input
          id={id}
          type="date"
          max={max}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
        />
      )}
      {grain === "month" && (
        <input
          id={id}
          type="month"
          max={max}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
        />
      )}
      {grain === "year" && (
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
        >
          {yearOptions().map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      )}
      {future && (
        <p className="mt-1 text-sm text-red-600" role="alert">
          {FUTURE_COPY}
        </p>
      )}
    </div>
  );
}
