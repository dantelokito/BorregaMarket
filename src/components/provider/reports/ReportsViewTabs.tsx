"use client";

export function ReportsViewTabs({
  current,
  onChange,
}: {
  current: "ventas" | "inventario";
  onChange: (next: "ventas" | "inventario") => void;
}) {
  return (
    <div role="tablist" aria-label="Vista de reportes" className="mb-6 flex gap-2">
      {(
        [
          ["ventas", "Ventas"],
          ["inventario", "Inventario"],
        ] as const
      ).map(([id, label]) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={current === id}
          aria-current={current === id ? "page" : undefined}
          className={`min-h-11 rounded-lg px-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--brand)] ${
            current === id
              ? "bg-[var(--brand)] text-white"
              : "border border-gray-300 bg-white text-slate-800"
          }`}
          onClick={() => onChange(id)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
