"use client";

export function DateRangeFields({
  from,
  to,
  max,
  error,
  onChange,
}: {
  from: string;
  to: string;
  max: string;
  error: string | null;
  onChange: (next: { from: string; to: string }) => void;
}) {
  return (
    <fieldset className="grid gap-3 sm:grid-cols-2">
      <legend className="sr-only">Rango de fechas</legend>
      <div>
        <label htmlFor="report-from" className="mb-1 block text-sm font-medium">
          Inicio
        </label>
        <input
          id="report-from"
          type="date"
          value={from}
          max={max}
          onChange={(e) => onChange({ from: e.target.value, to })}
          className="min-h-11 w-full rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
        />
      </div>
      <div>
        <label htmlFor="report-to" className="mb-1 block text-sm font-medium">
          Fin
        </label>
        <input
          id="report-to"
          type="date"
          value={to}
          max={max}
          onChange={(e) => onChange({ from, to: e.target.value })}
          className="min-h-11 w-full rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
        />
      </div>
      {error && (
        <p className="sm:col-span-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
