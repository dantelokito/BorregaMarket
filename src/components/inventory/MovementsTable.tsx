"use client";

import { CircleAlert, Package } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import type { InventoryMovement, InventoryMovementKind } from "@/lib/api/inventory";
import { formatQty } from "@/lib/format";
import { MOVEMENT_KIND_CLASS, MOVEMENT_KIND_LABEL, shrinkageReasonLabel } from "@/lib/inventory/movements-ui";

function TypeBadge({ kind }: { kind: InventoryMovementKind }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${MOVEMENT_KIND_CLASS[kind]}`}>
      {MOVEMENT_KIND_LABEL[kind]}
    </span>
  );
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-MX", { timeZone: "America/Monterrey" });
}

export function MovementsTable({
  rows,
  loading,
  error,
  page,
  totalPages,
  onRetry,
  onPage,
  onGoStock,
}: {
  rows: InventoryMovement[];
  loading: boolean;
  error: string;
  page: number;
  totalPages: number;
  onRetry: () => void;
  onPage: (next: number) => void;
  onGoStock: () => void;
}) {
  if (loading) {
    return (
      <ul className="mt-6 space-y-3" aria-busy="true" aria-label="Cargando movimientos">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="h-16 animate-pulse rounded-xl bg-gray-200" />
        ))}
      </ul>
    );
  }

  if (error) {
    return (
      <div className="mt-8">
        <EmptyState
          icon={<CircleAlert size={48} aria-hidden />}
          title="No pudimos cargar los movimientos"
          description="Revisa la conexión. No mostramos filas inventadas."
          action={
            <Button type="button" className="min-h-11" onClick={onRetry}>
              Reintentar
            </Button>
          }
        />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="mt-8">
        <EmptyState
          icon={<Package size={80} aria-hidden />}
          title="Aún no hay movimientos de entrada, merma o ajuste"
          description="Las ventas del POS y los pedidos Encargar no aparecen aquí."
          action={
            <Button type="button" variant="secondary" className="min-h-11" onClick={onGoStock}>
              Ir a Existencias
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <>
      <div className="mt-6 hidden overflow-x-auto rounded-xl border border-gray-200 bg-white lg:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Delta</th>
              <th className="px-4 py-3">Motivo</th>
              <th className="px-4 py-3">Nota</th>
              <th className="px-4 py-3">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-gray-50">
                <td className="px-4 py-3 whitespace-nowrap">{formatWhen(row.createdAt)}</td>
                <td className="px-4 py-3">{row.productName}</td>
                <td className="px-4 py-3">
                  <TypeBadge kind={row.kind} />
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {Number(row.appliedDelta) > 0 ? "+" : ""}
                  {formatQty(row.appliedDelta)}
                </td>
                <td className="px-4 py-3">{shrinkageReasonLabel(row.reason)}</td>
                <td className="px-4 py-3">{row.note || "—"}</td>
                <td className="px-4 py-3 tabular-nums">
                  {row.onHandAfter == null ? "—" : formatQty(row.onHandAfter)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="mt-6 space-y-3 lg:hidden">
        {rows.map((row) => (
          <li key={row.id} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <TypeBadge kind={row.kind} />
              <span className="text-xs text-slate-500">{formatWhen(row.createdAt)}</span>
            </div>
            <p className="mt-2 font-medium">{row.productName}</p>
            <p className="text-sm tabular-nums text-slate-700">
              Delta {Number(row.appliedDelta) > 0 ? "+" : ""}
              {formatQty(row.appliedDelta)}
            </p>
            <p className="text-sm text-slate-600">
              {shrinkageReasonLabel(row.reason)}
              {row.note ? ` · ${row.note}` : ""}
            </p>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-between gap-2">
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
    </>
  );
}
