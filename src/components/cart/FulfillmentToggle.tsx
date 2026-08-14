"use client";

import type { FulfillmentType } from "@/lib/api/types";

interface FulfillmentToggleProps {
  value: FulfillmentType;
  onChange: (v: FulfillmentType) => void;
}

export function FulfillmentToggle({ value, onChange }: FulfillmentToggleProps) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Cómo lo recibes</legend>
      <div className="flex gap-2">
        {(
          [
            { id: "PICKUP", label: "Recoger" },
            { id: "DELIVERY", label: "A domicilio" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.id}
            type="button"
            aria-pressed={value === opt.id}
            onClick={() => onChange(opt.id)}
            className={`h-11 flex-1 rounded-lg border px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--brand)] ${
              value === opt.id
                ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                : "border-gray-300 bg-white"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
