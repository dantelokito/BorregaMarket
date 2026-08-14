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
}

export function FavoriteAddressSelect({
  addresses,
  selectedId,
  onSelect,
  onSave,
  canSave,
  guest,
  loading,
}: FavoriteAddressSelectProps) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="min-w-[160px] flex-1">
        <label htmlFor="favorite-address" className="mb-1 block text-sm font-medium text-slate-700">
          Favoritas
        </label>
        <select
          id="favorite-address"
          value={selectedId ?? ""}
          disabled={loading || addresses.length === 0}
          onChange={(e) => {
            const found = addresses.find((a) => a.id === e.target.value);
            if (found) onSelect(found);
          }}
          className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
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
        className="inline-flex h-11 min-w-[44px] items-center rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] disabled:opacity-50"
      >
        {guest ? "Guardar dirección" : "+ Guardar dirección"}
      </button>
    </div>
  );
}
