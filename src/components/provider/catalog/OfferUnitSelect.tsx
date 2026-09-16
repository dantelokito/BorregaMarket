"use client";

import { PRODUCT_UNITS } from "@/lib/catalog/f13";

export function OfferUnitSelect({
  id,
  value,
  onChange,
  label = "Unidad de tu oferta",
}: {
  id: string;
  value: string;
  onChange: (next: string) => void;
  label?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-11 w-full rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
      >
        {PRODUCT_UNITS.map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
      </select>
    </div>
  );
}

export function BoxFactorField({
  id,
  value,
  onChange,
  required,
  error,
}: {
  id: string;
  value: string;
  onChange: (next: string) => void;
  required: boolean;
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        Factor caja {required ? "*" : ""}
      </label>
      <input
        id={id}
        type="number"
        min="0"
        step="0.001"
        value={value}
        aria-required={required}
        onChange={(e) => onChange(e.target.value)}
        className={`min-h-11 w-full rounded-lg border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)] ${
          error ? "border-red-500" : "border-gray-300"
        }`}
      />
      <p className="mt-1 text-xs text-slate-500">Cuántos kg o piezas trae una caja</p>
      {error ? (
        <p className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
