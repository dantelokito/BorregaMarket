"use client";

import { formatQty } from "@/lib/format";
import type { UnitOfMeasure } from "@/lib/api/types";
import { Minus, Plus } from "lucide-react";

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  productName: string;
  unitOfMeasure: UnitOfMeasure;
  disabled?: boolean;
  min?: number;
}

export function QuantityStepper({
  value,
  onChange,
  productName,
  unitOfMeasure,
  disabled = false,
  min = 0,
}: QuantityStepperProps) {
  const step = unitOfMeasure === "PZA" ? 1 : 0.1;
  const decimals = unitOfMeasure === "PZA" ? 0 : 3;

  function round(n: number) {
    const f = 10 ** decimals;
    return Math.round(n * f) / f;
  }

  function decrease() {
    onChange(Math.max(min, round(value - step)));
  }

  function increase() {
    onChange(round(value + step));
  }

  return (
    <div className="inline-flex items-center rounded-lg border border-gray-300">
      <button
        type="button"
        onClick={decrease}
        disabled={disabled || value <= min}
        aria-label={`Disminuir cantidad de ${productName}`}
        className="inline-flex h-11 w-11 items-center justify-center text-gray-700 hover:bg-gray-50 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--brand)]"
      >
        <Minus size={16} aria-hidden />
      </button>
      <span
        className="min-w-10 px-1 text-center text-sm font-semibold tabular-nums"
        aria-live="polite"
      >
        {formatQty(value)}
      </span>
      <button
        type="button"
        onClick={increase}
        disabled={disabled}
        aria-label={`Aumentar cantidad de ${productName}`}
        className="inline-flex h-11 w-11 items-center justify-center text-gray-700 hover:bg-gray-50 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--brand)]"
      >
        <Plus size={16} aria-hidden />
      </button>
    </div>
  );
}
