"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { Search, X } from "lucide-react";
import { getProviders, type ProviderCategory } from "@/lib/api/providers";
import { ApiError } from "@/lib/api/client";
import type { ProviderListing } from "@/lib/api/types";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";

const DEBOUNCE_MS = 300;

export interface ExploreTypeaheadFilters {
  verified?: boolean;
  category?: ProviderCategory;
  offersWholesale?: boolean;
  offersDelivery?: boolean;
}

interface ExploreTypeaheadProps {
  hasPin: boolean;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  filters?: ExploreTypeaheadFilters;
  initialQuery?: string;
  onApplyQuery: (q: string) => void;
  onClear: () => void;
}

export function ExploreTypeahead({
  hasPin,
  lat,
  lng,
  radiusKm,
  filters,
  initialQuery = "",
  onApplyQuery,
  onClear,
}: ExploreTypeaheadProps) {
  const listboxId = useId();
  const inputId = useId();
  const [query, setQuery] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [matches, setMatches] = useState<ProviderListing[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const abortRef = useRef<AbortController | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const fetchMatches = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim();
      if (trimmed.length < 2) {
        setMatches([]);
        setError("");
        setLoading(false);
        return;
      }
      if (!hasPin || lat == null || lng == null) {
        setMatches([]);
        setError("");
        setLoading(false);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError("");
      try {
        const { data } = await getProviders({
          q: trimmed,
          lat,
          lng,
          radiusKm,
          limit: 10,
          page: 1,
          verified: filters?.verified,
          category: filters?.category,
          offersWholesale: filters?.offersWholesale,
          offersDelivery: filters?.offersDelivery,
        });
        if (controller.signal.aborted) return;
        setMatches(data);
      } catch (err) {
        if (controller.signal.aborted) return;
        setMatches([]);
        setError(err instanceof ApiError ? err.message : "No pudimos buscar fruterías");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [hasPin, lat, lng, radiusKm, filters]
  );

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setMatches([]);
      setLoading(false);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetchMatches(trimmed);
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query, fetchMatches]);

  function apply(q: string) {
    onApplyQuery(q.trim());
    setOpen(false);
  }

  function clearAll() {
    setQuery("");
    setMatches([]);
    setOpen(false);
    onClear();
  }

  const showHintOneChar = query.trim().length === 1;
  const showNoPin = open && query.trim().length >= 2 && !hasPin;
  const showEmpty =
    open &&
    hasPin &&
    query.trim().length >= 2 &&
    !loading &&
    !error &&
    matches.length === 0;
  const showList = open && hasPin && matches.length > 0;

  return (
    <div ref={rootRef} className="relative w-full max-w-2xl">
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <label htmlFor={inputId} className="sr-only">
            Buscar fruterías
          </label>
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            id={inputId}
            type="search"
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={
              activeIndex >= 0 && matches[activeIndex]
                ? `${listboxId}-opt-${matches[activeIndex].id}`
                : undefined
            }
            value={query}
            placeholder="Buscar fruterías por nombre…"
            autoComplete="off"
            className="h-11 w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setActiveIndex(-1);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                setOpen(false);
                return;
              }
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setOpen(true);
                setActiveIndex((i) => Math.min(i + 1, matches.length - 1));
                return;
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
                return;
              }
              if (e.key === "Enter") {
                e.preventDefault();
                if (activeIndex >= 0 && matches[activeIndex]) {
                  apply(matches[activeIndex].businessName);
                } else if (query.trim().length >= 2) {
                  apply(query);
                }
              }
            }}
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="absolute right-1 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
              aria-label="Limpiar búsqueda y filtros"
            >
              <X size={16} aria-hidden />
            </button>
          )}
        </div>
      </div>

      {showHintOneChar && (
        <p className="mt-2 text-xs text-slate-500" role="status">
          Escribe al menos 2 caracteres
        </p>
      )}

      {open && (showNoPin || showEmpty || showList || error || loading) && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Fruterías sugeridas"
          className="absolute z-50 mt-2 max-h-80 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {loading && (
            <p className="px-4 py-3 text-sm text-slate-600" role="status">
              Buscando…
            </p>
          )}
          {error && (
            <p className="px-4 py-3 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          {showNoPin && (
            <p className="px-4 py-3 text-sm text-slate-600" role="status">
              Elige una ubicación para buscar fruterías.
            </p>
          )}
          {showEmpty && (
            <p className="px-4 py-3 text-sm text-slate-600" role="status">
              No hay fruterías con ese nombre en este radio.
            </p>
          )}
          {showList &&
            matches.map((row, index) => {
              const thumb = row.coverUrl ?? row.logoUrl;
              const active = index === activeIndex;
              return (
                <button
                  key={row.id}
                  type="button"
                  id={`${listboxId}-opt-${row.id}`}
                  role="option"
                  aria-selected={active}
                  className={`flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left text-sm focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--brand)] ${
                    active ? "bg-[var(--brand)]/10" : "hover:bg-slate-50"
                  }`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => apply(row.businessName)}
                >
                  <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-slate-100">
                    {thumb ? (
                      <Image
                        src={thumb}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    ) : (
                      <ImagePlaceholder variant="cover" className="absolute inset-0 h-full w-full" />
                    )}
                  </span>
                  <span className="truncate font-medium text-slate-900">{row.businessName}</span>
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}
