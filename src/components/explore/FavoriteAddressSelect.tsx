"use client";

import type { UserAddress } from "@/lib/api/types";

interface FavoriteAddressSelectProps {
  addresses: UserAddress[];
  selectedId: string | null;
  onSelect: (address: UserAddress) => void;
  onSave: () => void;
  canSave: boolean;
  guest: boolean;
  loading?: boolean;
  /** Fila compacta: label sr-only desde sm; select ancho fijo. */
  inline?: boolean;
  className?: string;
}

export function FavoriteAddressSelect({
  addresses,
  selectedId,
  onSelect,
  onSave,
  canSave,
  guest,
  loading,
  inline,
  className,
}: FavoriteAddressSelectProps) {
  return (
    <div
      className={[
        "flex gap-2",
        inline
          ? "flex-row flex-wrap items-end sm:flex-nowrap sm:items-center shrink-0"
          : "flex-wrap items-end",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={inline ? "min-w-[160px] flex-1 sm:w-[180px] sm:flex-none" : "min-w-[160px] flex-1"}>
        <label
          htmlFor="favorite-address"
          className={
            inline
              ? "mb-1 block text-sm font-medium text-slate-700 sm:sr-only sm:mb-0"
              : "mb-1 block text-sm font-medium text-slate-700"
          }
        >
          Favoritas
        </label>
        <select
          id="favorite-address"
          aria-label="Domicilios favoritos"
          value={selectedId ?? ""}
          disabled={loading || addresses.length === 0}
          onChange={(e) => {
            const found = addresses.find((a) => a.id === e.target.value);
            if (found) onSelect(found);
          }}
          className={[
            "w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]",
            "h-[var(--explore-addressbar-controls-h)]",
          ].join(" ")}
        >
          {addresses.length === 0 ? (
            <option value="">Sin direcciones guardadas</option>
          ) : (
            addresses.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))
          )}
        </select>
      </div>
      <button
        type="button"
        onClick={onSave}
        disabled={!canSave}
        className="inline-flex h-[var(--explore-addressbar-controls-h)] min-w-[44px] shrink-0 items-center rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] disabled:opacity-50"
      >
        {guest ? "Guardar dirección" : "+ Guardar dirección"}
      </button>
    </div>
  );
}
