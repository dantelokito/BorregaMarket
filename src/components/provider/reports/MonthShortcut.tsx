"use client";

export function MonthShortcut({
  value,
  max,
  onChange,
}: {
  value: string;
  max: string;
  onChange: (month: string) => void;
}) {
  return (
    <div>
      <label htmlFor="report-month" className="mb-1 block text-sm font-medium">
        Mes (atajo)
      </label>
      <input
        id="report-month"
        type="month"
        value={value}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-11 w-full rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
      />
    </div>
  );
}
