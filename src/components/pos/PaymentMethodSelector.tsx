"use client";

import type { PaymentMethod } from "@/lib/api/types";

interface PaymentMethodSelectorProps {
  value: "CASH" | "OTHER";
  onChange: (value: "CASH" | "OTHER") => void;
}

export function PaymentMethodSelector({ value, onChange }: PaymentMethodSelectorProps) {
  const options: { value: "CASH" | "OTHER"; label: string }[] = [
    { value: "CASH", label: "Efectivo" },
    { value: "OTHER", label: "Otro" },
  ];

  return (
    <div role="radiogroup" aria-label="Método de cobro" className="flex gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={`h-12 flex-1 rounded-lg border text-sm font-semibold ${
            value === opt.value
              ? "border-[var(--brand)] bg-[var(--brand)] text-white"
              : "border-gray-300 bg-white text-slate-700"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
