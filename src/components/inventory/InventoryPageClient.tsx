"use client";

import { useState } from "react";
import Link from "next/link";
import { CircleAlert, Package, Plus } from "lucide-react";
import { ActiveStoreEyebrow } from "@/components/provider/ActiveStoreEyebrow";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useInventory, useInventoryMutations } from "@/hooks/useInventory";
import { useProviderScope } from "@/hooks/useProviderScope";
import { formatQty } from "@/lib/format";
import { parseQtyString } from "@/lib/inventory/capacity";
import type { InventoryItem } from "@/lib/api/inventory";
import { CatalogRowThumb } from "./CatalogRowThumb";
import { EncargarReserveChip } from "./EncargarReserveChip";
import { InventoryCapacityBar } from "./InventoryCapacityBar";
import { InventorySkuSheet } from "./InventorySkuSheet";
import { LowStockBadge } from "./LowStockBadge";
import { StockEntrySheet } from "./StockEntrySheet";

export function InventoryPageClient() {
  const { activeName } = useProviderScope();
  const { items, loading, error, refetch } = useInventory();
  const mutations = useInventoryMutations(refetch);
  const [entryItem, setEntryItem] = useState<InventoryItem | null>(null);
  const [fichaItem, setFichaItem] = useState<InventoryItem | null>(null);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <ActiveStoreEyebrow />
      <h1 className="text-2xl font-bold">Inventario{activeName ? ` — ${activeName}` : ""}</h1>
      <p className="mt-1 text-sm text-slate-500">
        Existencias de esta frutería. No se comparte con otras sucursales.
      </p>

      {loading ? (
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
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-2">
                        <Button
                          type="button"
                          className="min-h-11"
                          onClick={() => setEntryItem(item)}
                        >
                          <Plus size={16} aria-hidden />
                          Registrar entrada
                        </Button>
                        <Button type="button" variant="ghost" className="min-h-11" onClick={() => setFichaItem(item)}>
                          Editar ficha
                        </Button>
                      </div>
                    </td>
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
                <Button
                  type="button"
                  className="mt-4 min-h-11 w-full"
                  onClick={() => setEntryItem(item)}
                >
                  Registrar entrada
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-2 min-h-11 w-full"
                  onClick={() => setFichaItem(item)}
                >
                  Editar ficha
                </Button>
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
