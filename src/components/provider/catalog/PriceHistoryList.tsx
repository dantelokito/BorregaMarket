"use client";

import { formatPriceHistoryLine } from "@/lib/catalog/f13";
import type { PriceHistoryRow } from "@/lib/api/types";
import { Button } from "@/components/ui/Button";

export function PriceHistoryList({
  name,
  rows,
  loading,
  error,
  empty,
  onRetry,
  onClose,
}: {
  name: string;
  rows: PriceHistoryRow[];
  loading: boolean;
  error: string;
  empty: boolean;
  onRetry: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[85] flex items-end justify-center sm:items-center">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Cerrar historial" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Historial de precio · ${name}`}
        className="relative w-full max-w-md rounded-t-xl bg-white p-5 shadow-lg sm:rounded-xl"
      >
        <h2 className="text-lg font-semibold">Historial de precio · {name}</h2>
        {loading ? (
          <div className="mt-4 space-y-2" aria-busy>
            <div className="h-6 animate-pulse rounded bg-slate-100" />
            <div className="h-6 animate-pulse rounded bg-slate-100" />
          </div>
        ) : error ? (
          <div className="mt-4">
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
            <Button type="button" variant="secondary" className="mt-2 min-h-11" onClick={onRetry}>
              Reintentar
            </Button>
          </div>
        ) : empty ? (
          <p className="mt-4 text-sm text-slate-600">Aún no hay cambios de precio.</p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            {rows.map((row) => (
              <li key={row.id}>{formatPriceHistoryLine(row)}</li>
            ))}
          </ul>
        )}
        <Button type="button" variant="secondary" className="mt-5 min-h-11 w-full" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </div>
  );
}
