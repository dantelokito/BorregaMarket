"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { FavoriteAddressSelect } from "./FavoriteAddressSelect";
import type { UserAddress } from "@/lib/api/types";
import { SAN_NICOLAS_CENTER } from "@/lib/maps/constants";

interface CompactAddressBarProps {
  pinLabel?: string;
  geoDenied: boolean;
  onSearchAddress: (query: string) => Promise<void>;
  addresses: UserAddress[];
  selectedAddressId: string | null;
  onSelectAddress: (address: UserAddress) => void;
  onSaveAddress: () => void;
  canSave: boolean;
  guest: boolean;
  /** Conteo Must "{N} fruterías a {R} km" y avisos de búsqueda. */
  children?: React.ReactNode;
}

export function CompactAddressBar({
  pinLabel,
  geoDenied,
  onSearchAddress,
  addresses,
  selectedAddressId,
  onSelectAddress,
  onSaveAddress,
  canSave,
  guest,
  children,
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
    <section className="space-y-2 border-b border-gray-100 bg-white px-4 py-2 sm:px-6 sm:py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <form onSubmit={submitSearch} className="flex min-w-0 flex-1 gap-2">
          <label htmlFor="geocode-query" className="sr-only">
            Buscar dirección
          </label>
          <input
            id="geocode-query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar dirección"
            className="h-[var(--explore-addressbar-controls-h)] min-w-0 flex-1 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          />
          <button
            type="submit"
            disabled={searching}
            className="inline-flex h-[var(--explore-addressbar-controls-h)] w-11 shrink-0 items-center justify-center rounded-lg bg-[var(--brand)] text-white focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            aria-label="Buscar dirección"
          >
            <Search size={16} />
          </button>
        </form>

        <FavoriteAddressSelect
          inline
          className="shrink-0"
          addresses={addresses}
          selectedId={selectedAddressId}
          onSelect={onSelectAddress}
          onSave={onSaveAddress}
          canSave={canSave}
          guest={guest}
        />
      </div>

      {searchError && (
        <p className="text-sm text-red-600" role="alert">
          {searchError}
        </p>
      )}
      {geoDenied && (
        <p className="text-sm text-slate-600">
          Busca una dirección o usa una favorita. El mapa se centra en San Nicolás (
          {SAN_NICOLAS_CENTER.lat.toFixed(2)}, {SAN_NICOLAS_CENTER.lng.toFixed(2)}).
        </p>
      )}

      {pinLabel && <p className="text-sm text-slate-600">Centro: {pinLabel}</p>}

      {children}
    </section>
  );
}
