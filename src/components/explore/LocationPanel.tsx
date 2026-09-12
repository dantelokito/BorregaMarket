"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import type { UserAddress } from "@/lib/api/types";
import { FavoriteAddressRow } from "./FavoriteAddressRow";

interface LocationPanelProps {
  variant: "sheet" | "popover";
  onClose: () => void;
  onSearchAddress: (query: string) => Promise<void>;
  addresses: UserAddress[];
  selectedAddressId: string | null;
  onSelectAddress: (address: UserAddress) => void;
  onDeleteAddress: (address: UserAddress) => void;
  onSaveAddress: () => void;
  canSave: boolean;
  guest: boolean;
  atLimit: boolean;
}

export function LocationPanel({
  variant,
  onClose,
  onSearchAddress,
  addresses,
  selectedAddressId,
  onSelectAddress,
  onDeleteAddress,
  onSaveAddress,
  canSave,
  guest,
  atLimit,
}: LocationPanelProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

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
      onClose();
    } catch (err) {
      if (err instanceof Error && err.message === "out-of-mexico") {
        onClose();
        return;
      }
      setSearchError("No encontramos esa dirección");
    } finally {
      setSearching(false);
    }
  }

  const body = (
    <div ref={panelRef} className="relative flex max-h-[min(70vh,32rem)] flex-col">
      {variant === "sheet" && (
        <div className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-slate-300" aria-hidden />
      )}
      <div className="flex items-center justify-between gap-2 px-4 pt-3">
        <h2 id={titleId} className="text-base font-semibold text-slate-900">
          Dónde buscas
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-11 min-w-11 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
        >
          <X size={18} aria-hidden />
          <span className="sr-only sm:not-sr-only sm:ml-1">Cerrar</span>
        </button>
      </div>

      <form onSubmit={submitSearch} className="flex gap-2 px-4 pt-3">
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
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[var(--brand)] text-white focus:outline-none focus:ring-2 focus:ring-[var(--brand)] disabled:opacity-50"
          aria-label="Buscar dirección"
        >
          <Search size={16} />
        </button>
      </form>
      {searchError && (
        <p className="px-4 pt-2 text-sm text-red-600" role="alert" aria-live="polite">
          {searchError}
        </p>
      )}

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        <p className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
          Guardadas
        </p>
        {addresses.length === 0 ? (
          <p className="px-2 py-3 text-sm text-slate-600">Aún no tienes direcciones guardadas</p>
        ) : (
          <ul className="space-y-1">
            {addresses.map((address) => (
              <li key={address.id}>
                <FavoriteAddressRow
                  address={address}
                  selected={address.id === selectedAddressId}
                  onSelect={(a) => {
                    onSelectAddress(a);
                    onClose();
                  }}
                  onDelete={onDeleteAddress}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-slate-100 px-4 py-3">
        {atLimit && (
          <p className="mb-2 text-sm text-slate-600" role="status">
            Llegaste al límite de 20 direcciones. Quita una para guardar otra.
          </p>
        )}
        {!canSave && !atLimit && (
          <p className="mb-2 text-sm text-slate-600">Elige un punto en el mapa primero.</p>
        )}
        <button
          type="button"
          onClick={onSaveAddress}
          disabled={!canSave || atLimit}
          className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] disabled:opacity-50"
        >
          {guest ? "Guardar esta ubicación" : "+ Guardar esta ubicación"}
        </button>
      </div>
    </div>
  );

  if (variant === "sheet") {
    return (
      <div className="fixed inset-0 z-[500]">
        <button
          type="button"
          className="absolute inset-0 bg-slate-900/40"
          aria-label="Cerrar"
          onClick={onClose}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="absolute inset-x-0 bottom-0 overflow-hidden rounded-t-2xl bg-white shadow-xl"
        >
          {body}
        </div>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="absolute left-0 top-full z-[500] mt-2 min-w-80 max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
    >
      {body}
    </div>
  );
}
