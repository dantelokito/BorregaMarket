"use client";

import { Button } from "@/components/ui/Button";
import type { CatalogItem } from "@/lib/api/types";
import { formatHistoryWhen } from "@/lib/catalog/f13";

export function ArchivedTray({
  items,
  loading,
  error,
  onRetry,
  onRestore,
  restoringId,
}: {
  items: CatalogItem[];
  loading: boolean;
  error: string;
  onRetry: () => void;
  onRestore: (item: CatalogItem) => void;
  restoringId: string | null;
}) {
  return (
    <details className="mt-8 rounded-xl border border-gray-200 bg-white">
      <summary className="min-h-11 cursor-pointer px-5 py-3 text-sm font-medium text-slate-800">
        Eliminados de la vista
      </summary>
      {loading ? (
        <div className="space-y-2 px-5 py-4" aria-busy>
          <div className="h-10 animate-pulse rounded bg-slate-100" />
          <div className="h-10 animate-pulse rounded bg-slate-100" />
          <div className="h-10 animate-pulse rounded bg-slate-100" />
        </div>
      ) : error ? (
        <div className="px-5 py-4">
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
          <Button type="button" variant="secondary" className="mt-2 min-h-11" onClick={onRetry}>
            Reintentar
          </Button>
        </div>
      ) : items.length === 0 ? (
        <p className="px-5 py-4 text-sm text-slate-600">No hay productos eliminados de la vista.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {items.map((item) => (
            <li
              key={item.product.id}
              className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">{item.product.name}</p>
                <p className="text-xs text-slate-500">
                  oculto {item.archivedAt ? formatHistoryWhen(item.archivedAt) : ""}
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="min-h-11"
                disabled={restoringId === item.product.id}
                onClick={() => onRestore(item)}
              >
                Restaurar
              </Button>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}
