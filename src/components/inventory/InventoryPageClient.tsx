"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CircleAlert, Package, Plus } from "lucide-react";
import { ActiveStoreEyebrow } from "@/components/provider/ActiveStoreEyebrow";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { DateRangeFields } from "@/components/provider/reports/DateRangeFields";
import { useInventory, useInventoryMutations } from "@/hooks/useInventory";
import { useInventoryMovements } from "@/hooks/useInventoryMovements";
import { useProviderScope } from "@/hooks/useProviderScope";
import { formatQty } from "@/lib/format";
import { parseQtyString } from "@/lib/inventory/capacity";
import type { InventoryItem, InventoryMovementKind } from "@/lib/api/inventory";
import { ymdInTimeZone } from "@/lib/timezone";
import { validateDateRange } from "@/lib/reports/date-range";
import { CatalogRowThumb } from "./CatalogRowThumb";
import { EncargarReserveChip } from "./EncargarReserveChip";
import { InventoryCapacityBar } from "./InventoryCapacityBar";
import { InventorySkuSheet } from "./InventorySkuSheet";
import { InventorySubTabs } from "./InventorySubTabs";
import { LowStockBadge } from "./LowStockBadge";
import { MermaSheet } from "./MermaSheet";
import { CountAdjustSheet } from "./CountAdjustSheet";
import { MovementsTable } from "./MovementsTable";
import { StockEntrySheet } from "./StockEntrySheet";

function InventoryPageInner() {
  const { activeName } = useProviderScope();
  const { items, loading, error, refetch } = useInventory();
  const mutations = useInventoryMutations(refetch);
  const [entryItem, setEntryItem] = useState<InventoryItem | null>(null);
  const [mermaItem, setMermaItem] = useState<InventoryItem | null>(null);
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [fichaItem, setFichaItem] = useState<InventoryItem | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams.get("tab") === "movimientos" ? "movimientos" : "existencias";
  const today = ymdInTimeZone(new Date());
  const kindRaw = searchParams.get("kind");
  const kind: InventoryMovementKind | undefined =
    kindRaw === "ENTRADA" || kindRaw === "MERMA" || kindRaw === "AJUSTE" ? kindRaw : undefined;
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const rangeError = from && to ? validateDateRange(from, to, today) : from || to ? "Indica inicio y fin juntos" : null;

  const movementFilters = useMemo(
    () => ({
      kind,
      from: from && to && !rangeError ? from : undefined,
      to: from && to && !rangeError ? to : undefined,
      page,
      enabled: tab === "movimientos",
    }),
    [kind, from, to, page, tab, rangeError]
  );
  const movements = useInventoryMovements(movementFilters);

  function pushMovements(next: { kind?: string; from?: string; to?: string; page?: number }) {
    const params = new URLSearchParams();
    params.set("tab", "movimientos");
    const nextKind = next.kind === undefined ? kindRaw : next.kind;
    if (nextKind) params.set("kind", nextKind);
    const nextFrom = next.from ?? from;
    const nextTo = next.to ?? to;
    if (nextFrom) params.set("from", nextFrom);
    if (nextTo) params.set("to", nextTo);
    params.set("page", String(next.page ?? 1));
    router.replace(`/proveedor/inventario?${params.toString()}`, { scroll: false });
  }

  const actionButtons = (item: InventoryItem, fullWidth?: boolean) => (
    <div className={`flex flex-col gap-2 ${fullWidth ? "" : ""}`}>
      <Button type="button" className="min-h-11" onClick={() => setEntryItem(item)}>
        <Plus size={16} aria-hidden />
        Registrar entrada
      </Button>
      <Button type="button" variant="secondary" className="min-h-11" onClick={() => setMermaItem(item)}>
        Registrar merma
      </Button>
      <Button type="button" variant="ghost" className="min-h-11" onClick={() => setAdjustItem(item)}>
        Ajuste por conteo
      </Button>
      <Button type="button" variant="ghost" className="min-h-11" onClick={() => setFichaItem(item)}>
        Editar ficha
      </Button>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <ActiveStoreEyebrow />
      <h1 className="text-2xl font-bold">Inventario{activeName ? ` — ${activeName}` : ""}</h1>
      <p className="mt-1 text-sm text-slate-500">
        Existencias de esta frutería. No se comparte con otras sucursales.
      </p>
      <InventorySubTabs current={tab} />

      {tab === "movimientos" ? (
        <>
          <p className="mt-4 text-sm text-slate-600">
            Solo ves entradas, mermas y ajustes que registraste. Las ventas del POS y los pedidos
            Encargar no aparecen aquí.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {([undefined, "ENTRADA", "MERMA", "AJUSTE"] as const).map((value) => {
              const label = value ? { ENTRADA: "Entrada", MERMA: "Merma", AJUSTE: "Ajuste" }[value] : "Todos";
              const active = (value ?? "") === (kind ?? "");
              return (
                <button
                  key={label}
                  type="button"
                  className={`min-h-11 rounded-full px-4 text-sm font-medium ${
                    active ? "bg-[var(--brand)] text-white" : "bg-slate-100 text-slate-700"
                  }`}
                  onClick={() => pushMovements({ kind: value ?? "", page: 1 })}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div className="mt-4 max-w-xl">
            <DateRangeFields
              from={from}
              to={to}
              max={today}
              error={rangeError}
              onChange={(next) => pushMovements({ from: next.from, to: next.to, page: 1 })}
            />
          </div>
          <MovementsTable
            rows={movements.rows}
            loading={movements.loading}
            error={rangeError ?? movements.error}
            page={page}
            totalPages={movements.totalPages}
            onRetry={() => void movements.refetch()}
            onPage={(next) => pushMovements({ page: next })}
            onGoStock={() => router.replace("/proveedor/inventario")}
          />
        </>
      ) : loading ? (
        <ul className="mt-6 space-y-3" aria-busy="true" aria-label="Cargando inventario">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="h-20 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </ul>
      ) : error ? (
        <div className="mt-8">
          <EmptyState
            icon={<CircleAlert size={48} aria-hidden />}
            title="No pudimos cargar el inventario"
            description="Revisa la conexión. No mostramos saldos inventados."
            action={
              <Button type="button" className="min-h-11" onClick={() => void refetch()}>
                Reintentar
              </Button>
            }
          />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={<Package size={48} aria-hidden />}
            title="Aún no hay productos en esta frutería"
            description="Agrega SKUs en Catálogo para ver existencias aquí."
            action={
              <Link
                href="/proveedor"
                className="inline-flex min-h-11 items-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold"
              >
                Ir a Catálogo
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-6 hidden overflow-x-auto rounded-xl border border-gray-200 bg-white lg:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">On-hand</th>
                  <th className="px-4 py-3">Capacidad</th>
                  <th className="px-4 py-3">Alerta</th>
                  <th className="px-4 py-3">Encargar</th>
                  <th className="px-4 py-3">Acción</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.providerProductId} className="border-b border-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <CatalogRowThumb src={item.imageUrl} name={item.name} />
                        <span className="font-medium">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatQty(parseQtyString(item.onHand))} {item.effectiveSaleUnit ?? item.unit}
                    </td>
                    <td className="px-4 py-3">
                      <InventoryCapacityBar fillPercent={item.fillPercent} />
                    </td>
                    <td className="px-4 py-3">
                      <LowStockBadge show={item.lowStockAlert} />
                    </td>
                    <td className="px-4 py-3">
                      <EncargarReserveChip reserved={item.reserved} unit={item.unit} />
                    </td>
                    <td className="px-4 py-3">{actionButtons(item)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="mt-6 space-y-4 lg:hidden">
            {items.map((item) => (
              <li key={item.providerProductId} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  <CatalogRowThumb src={item.imageUrl} name={item.name} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm tabular-nums text-slate-600">
                      {formatQty(parseQtyString(item.onHand))} {item.effectiveSaleUnit ?? item.unit}
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <InventoryCapacityBar fillPercent={item.fillPercent} />
                </div>
                <div className="mt-2 flex flex-wrap gap-3">
                  <LowStockBadge show={item.lowStockAlert} />
                  <EncargarReserveChip reserved={item.reserved} unit={item.unit} />
                </div>
                <div className="mt-4">{actionButtons(item, true)}</div>
              </li>
            ))}
          </ul>
        </>
      )}

      <StockEntrySheet
        item={entryItem}
        open={Boolean(entryItem)}
        busy={mutations.busy}
        apiError={mutations.formError}
        onClose={() => setEntryItem(null)}
        onSubmit={(qty) => mutations.submitEntry(entryItem!.providerProductId, qty)}
        onOpenFicha={() => {
          if (entryItem) {
            setFichaItem(entryItem);
            setEntryItem(null);
          }
        }}
      />
      <MermaSheet
        item={mermaItem}
        open={Boolean(mermaItem)}
        busy={mutations.busy}
        apiError={mutations.formError}
        onClose={() => setMermaItem(null)}
        onSubmit={(input) => mutations.submitShrinkage(mermaItem!.providerProductId, input)}
      />
      <CountAdjustSheet
        item={adjustItem}
        open={Boolean(adjustItem)}
        busy={mutations.busy}
        apiError={mutations.formError}
        onClose={() => setAdjustItem(null)}
        onSubmit={(input) => mutations.submitAdjustment(adjustItem!.providerProductId, input)}
      />
      <InventorySkuSheet
        item={fichaItem}
        open={Boolean(fichaItem)}
        busy={mutations.busy}
        apiError={mutations.formError}
        fieldErrors={mutations.fieldErrors}
        onClose={() => setFichaItem(null)}
        onSubmit={(input) => mutations.submitFicha(fichaItem!.providerProductId, input)}
      />
    </div>
  );
}

export function InventoryPageClient() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="h-10 w-48 animate-pulse rounded bg-gray-200" />
          <div className="mt-6 h-20 animate-pulse rounded-xl bg-gray-200" />
        </div>
      }
    >
      <InventoryPageInner />
    </Suspense>
  );
}
