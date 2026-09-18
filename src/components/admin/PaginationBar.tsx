"use client";

import { Button } from "@/components/ui/Button";

export function PaginationBar({
  page,
  totalPages,
  total,
  limit,
  onPage,
  onLimit,
}: {
  page: number;
  totalPages: number;
  total: number;
  limit: 50 | 100;
  onPage: (page: number) => void;
  onLimit: (limit: 50 | 100) => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-600">
        Página {page} de {Math.max(totalPages, 1)} · {total} registros
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm">
          <span>Por página</span>
          <select
            className="min-h-11 rounded-lg border border-gray-300 px-2 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            value={limit}
            onChange={(e) => onLimit(Number(e.target.value) === 100 ? 100 : 50)}
            aria-label="Registros por página"
          >
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </label>
        <Button
          type="button"
          variant="secondary"
          className="min-h-11"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Anterior
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="min-h-11"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
