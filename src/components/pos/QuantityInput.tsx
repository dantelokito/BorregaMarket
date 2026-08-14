"use client";

interface QuantityInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function QuantityInput({ value, onChange, error }: QuantityInputProps) {
  return (
    <div>
      <label htmlFor="pos-qty" className="mb-1 block text-sm font-medium">
        Cantidad
      </label>
      <input
        id="pos-qty"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(",", "."))}
        className={`w-full min-h-14 rounded-lg border px-4 text-right text-[32px] tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--brand)] ${
          error ? "border-red-500" : "border-gray-300"
        }`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "pos-qty-error" : undefined}
      />
      {error && (
        <p id="pos-qty-error" className="mt-1 text-sm text-red-600" role="alert" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  );
}
