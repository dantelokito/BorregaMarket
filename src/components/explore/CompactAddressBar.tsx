"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { FavoriteAddressSelect } from "./FavoriteAddressSelect";
import type { UserAddress } from "@/lib/api/types";
import { MONTERREY_CENTER } from "@/lib/maps/constants";

interface CompactAddressBarProps {
  hasPin: boolean;
  pinLabel?: string;
  radiusKm: number;
  geoDenied: boolean;
  onSearchAddress: (query: string) => Promise<void>;
  addresses: UserAddress[];
  selectedAddressId: string | null;
  onSelectAddress: (address: UserAddress) => void;
  onSaveAddress: () => void;
  canSave: boolean;
  guest: boolean;
}

export function CompactAddressBar({
  hasPin,
  pinLabel,
  radiusKm,
  geoDenied,
  onSearchAddress,
  addresses,
  selectedAddressId,
  onSelectAddress,
  onSaveAddress,
  canSave,
  guest,
}: CompactAddressBarProps) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  async function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 3) {
      setSearchError("Escribe al menos 3 caracteres");
      return;
    }
    setSearching(true);
    setSearchError("");
    try {
      await onSearchAddress(q);
    } catch {
      setSearchError("No encontramos esa dirección");
    } finally {
      setSearching(false);
    }
  }

  return (
    <section className="space-y-3 border-b border-gray-100 bg-white px-6 py-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <form onSubmit={submitSearch} className="flex min-w-0 flex-1 gap-2">
          <label htmlFor="geocode-query" className="sr-only">
            Buscar dirección
          </label>
          <input
            id="geocode-query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar dirección"
            className="h-11 min-w-0 flex-1 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          />
          <button
            type="submit"
            disabled={searching}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--brand)] text-white focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            aria-label="Buscar dirección"
          >
            <Search size={16} />
          </button>
        </form>

        <div className="lg:w-[280px]">
          <FavoriteAddressSelect
            addresses={addresses}
            selectedId={selectedAddressId}
            onSelect={onSelectAddress}
            onSave={onSaveAddress}
            canSave={canSave}
            guest={guest}
          />
        </div>
      </div>

      {searchError && (
        <p className="text-sm text-red-600" role="alert">
          {searchError}
        </p>
      )}
      {geoDenied && (
        <p className="text-sm text-slate-600">
          Busca una dirección o usa una favorita. El mapa se centra en Monterrey (
          {MONTERREY_CENTER.lat.toFixed(2)}, {MONTERREY_CENTER.lng.toFixed(2)}).
        </p>
      )}

      <p className="text-sm text-slate-600">
        {hasPin
          ? `Fruterías a ${radiusKm} km${pinLabel ? ` de ${pinLabel}` : ""}`
          : "Activa ubicación o busca una dirección para filtrar por radio"}
      </p>
    </section>
  );
}
