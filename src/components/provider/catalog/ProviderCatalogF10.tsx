"use client";

import { useMemo, useState } from "react";
import { Folder } from "lucide-react";
import { Check, LoaderCircle, ToggleLeft, ToggleRight } from "lucide-react";
import type { CatalogItem, ProviderSection } from "@/lib/api/types";
import {
  createSection,
  deleteSection,
  patchLocalProduct,
  patchSection,
  reorderSections,
  updateProduct,
  uploadProviderProductImage,
} from "@/lib/api/provider-panel";
import { ApiError } from "@/lib/api/client";
import { groupCatalogBySection } from "@/lib/catalog/group-by-section";
import { mapF10ApiError } from "@/lib/ui/f10-errors";
import { PriceInput } from "@/components/provider/PriceInput";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CatalogToolbarF10 } from "./CatalogToolbarF10";
import { SectionBlock } from "./SectionBlock";
import { ScopeBadge } from "./ScopeBadge";
import { ProductImageDropzone } from "./ProductImageDropzone";
import { ProductFormDrawer } from "./ProductFormDrawer";
import { ArchivedTray } from "./ArchivedTray";
import { PriceHistoryList } from "./PriceHistoryList";
import { PriceRequiredDialog } from "./PriceRequiredDialog";
import { CatalogRowThumb } from "@/components/inventory/CatalogRowThumb";
import { InventoryCapacityBar } from "@/components/inventory/InventoryCapacityBar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  archiveProviderProduct,
  getPriceHistory,
  patchOfferPrice,
  restoreProviderProduct,
} from "@/lib/api/provider-f13";
import { effectiveSaleUnit, staleOfferCopy } from "@/lib/catalog/f13";
import { needsPriceToActivate } from "@/lib/catalog/activate-price";
import type { PriceHistoryRow } from "@/lib/api/types";

export function ProviderCatalogF10({
  catalog,
  sections,
  onReload,
  archived,
  archivedLoading,
  archivedError,
  onReloadArchived,
}: {
  catalog: CatalogItem[];
  sections: ProviderSection[];
  onReload: () => Promise<void>;
  archived: CatalogItem[];
  archivedLoading: boolean;
  archivedError: string;
  onReloadArchived: () => Promise<void>;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [newSectionOpen, setNewSectionOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [sectionError, setSectionError] = useState("");
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [rowBusy, setRowBusy] = useState<Record<string, boolean>>({});
  const [rowOk, setRowOk] = useState<Record<string, boolean>>({});
  const [imageTarget, setImageTarget] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<CatalogItem | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [historyItem, setHistoryItem] = useState<CatalogItem | null>(null);
  const [historyRows, setHistoryRows] = useState<PriceHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [priceTarget, setPriceTarget] = useState<CatalogItem | null>(null);
  const [priceBusy, setPriceBusy] = useState(false);
  const [priceApiError, setPriceApiError] = useState("");
  const [sectionConflict, setSectionConflict] = useState("");

  const groups = useMemo(
    () => groupCatalogBySection(catalog, sections),
    [catalog, sections]
  );

  async function handleCreateSection() {
    const name = newSectionName.trim();
    if (!name) {
      setSectionError("Indica un nombre");
      return;
    }
    setSectionError("");
    try {
      await createSection(name);
      setNewSectionName("");
      setNewSectionOpen(false);
      await onReload();
    } catch (err) {
      setSectionError(mapF10ApiError(err, "business"));
    }
  }

  async function moveSection(id: string, direction: -1 | 1) {
    const ids = sections.map((s) => s.id);
    const index = ids.indexOf(id);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= ids.length) return;
    const swapped = [...ids];
    const current = swapped[index];
    swapped[index] = swapped[next];
    swapped[next] = current;
    await reorderSections(swapped);
    await onReload();
  }

  async function toggleProduct(item: CatalogItem) {
    const productId = item.product.id;
    const turningOn = !item.isAvailable;
    if (turningOn && needsPriceToActivate(item.price, true)) {
      setPriceTarget(item);
      setPriceApiError("");
      return;
    }
    setRowErrors((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
    setRowBusy((prev) => ({ ...prev, [productId]: true }));
    try {
      if (item.scope === "LOCAL" && item.providerProductId) {
        await patchLocalProduct(item.providerProductId, { isAvailable: !item.isAvailable });
      } else {
        await updateProduct({
          productId,
          isAvailable: !item.isAvailable,
          ...(turningOn && item.price != null && item.price > 0 ? { price: item.price } : {}),
        });
      }
      await onReload();
      setRowOk((prev) => ({ ...prev, [productId]: true }));
      window.setTimeout(() => {
        setRowOk((prev) => {
          const next = { ...prev };
          delete next[productId];
          return next;
        });
      }, 2000);
    } catch (err) {
      setRowErrors((prev) => ({
        ...prev,
        [productId]: mapF10ApiError(err, "business"),
      }));
    } finally {
      setRowBusy((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
    }
  }

  async function savePrice(item: CatalogItem, price: number) {
    await patchOfferPrice(item.product.id, price.toFixed(2));
    await onReload();
  }

  async function loadHistory(item: CatalogItem) {
    if (!item.providerProductId) {
      setHistoryItem(item);
      setHistoryRows([]);
      setHistoryError("");
      return;
    }
    setHistoryItem(item);
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const { data } = await getPriceHistory(item.providerProductId);
      setHistoryRows(data);
    } catch (err) {
      setHistoryError(staleOfferCopy(mapF10ApiError(err, "business")));
      setHistoryRows([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function assignSection(item: CatalogItem, sectionId: string) {
    if (item.scope === "LOCAL" && item.providerProductId) {
      if (!sectionId) return;
      await patchLocalProduct(item.providerProductId, { sectionId });
    } else {
      if (!sectionId) return;
      await updateProduct({
        productId: item.product.id,
        isAvailable: item.isAvailable,
        price: item.price ?? undefined,
        sectionId: sectionId || undefined,
      });
    }
    await onReload();
  }

  function renderRow(item: CatalogItem) {
    const key = item.product.id;
    return (
      <div
        key={key}
        className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <CatalogRowThumb
              src={item.imageUrl ?? item.product.imageUrl}
              name={item.product.name}
              category={item.product.category}
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{item.product.name}</p>
                <ScopeBadge scope={item.scope} />
              </div>
              <div className="mt-1 w-full min-w-[10rem]">
                <span className="sr-only">Precio de tu frutería</span>
                <PriceInput
                  value={item.price}
                  unit={item.effectiveSaleUnit ?? effectiveSaleUnit(item.saleUnit, item.product.unit)}
                  onSave={(price) => savePrice(item, price)}
                />
                <button
                  type="button"
                  className="mt-1 min-h-11 text-sm text-[var(--brand)] underline-offset-2 hover:underline"
                  onClick={() => void loadHistory(item)}
                >
                  Historial
                </button>
              </div>
            </div>
          </div>
          {sections.length > 0 && (
            <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
              <span className="sr-only">Sección de {item.product.name}</span>
              <select
                value={item.sectionId ?? ""}
                onChange={(e) => void assignSection(item, e.target.value)}
                className="min-h-11 rounded-lg border border-gray-200 px-2 text-sm"
                aria-label={`Sección de ${item.product.name}`}
              >
                <option value="">Sin sección</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {rowErrors[key] && (
            <p className="mt-1 text-xs text-red-600" role="alert">
              {rowErrors[key]}
            </p>
          )}
        </div>
        <div className="w-full min-w-[80px] sm:w-28">
          {item.providerProductId ? (
            <InventoryCapacityBar fillPercent={item.fillPercent} compact />
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {item.providerProductId && (
            <button
              type="button"
              className="text-sm text-[var(--brand)] underline-offset-2 hover:underline"
              onClick={() => setImageTarget(item.providerProductId)}
            >
              Foto
            </button>
          )}
          <Button
            type="button"
            variant="secondary"
            className="min-h-11"
            onClick={() => {
              setEditing(item);
              setDrawerOpen(true);
            }}
          >
            Editar
          </Button>
          <button
            type="button"
            onClick={() => void toggleProduct(item)}
            disabled={rowBusy[key]}
            aria-label={`${item.product.name}: ${item.isAvailable ? "Activo" : "Inactivo"}`}
            aria-pressed={item.isAvailable}
            className={`flex min-h-[44px] min-w-[44px] items-center gap-2 rounded-full px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--brand)] disabled:opacity-60 ${
              item.isAvailable ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
            }`}
          >
            {rowBusy[key] ? (
              <LoaderCircle size={18} className="animate-spin" aria-hidden />
            ) : rowOk[key] ? (
              <Check size={18} aria-hidden />
            ) : item.isAvailable ? (
              <ToggleRight size={18} aria-hidden />
            ) : (
              <ToggleLeft size={18} aria-hidden />
            )}
            {item.isAvailable ? "Activo" : "Inactivo"}
          </button>
          <Button
            type="button"
            variant="secondary"
            className="min-h-11"
            onClick={() => setArchiveTarget(item)}
          >
            Eliminar
          </Button>
        </div>
      </div>
    );
  }

  const imageItem = catalog.find((c) => c.providerProductId === imageTarget) ?? null;

  return (
    <div>
      <p className="mb-4 text-sm text-slate-600">
        Activa el catálogo global o agrega productos solo de tu frutería. Inactivo: no aparece en
        explorar, pedidos ni POS.
      </p>
      <CatalogToolbarF10
        onAddProduct={() => {
          setEditing(null);
          setDrawerOpen(true);
        }}
        onNewSection={() => setNewSectionOpen(true)}
        addDisabled={sections.length === 0}
      />
      {sectionConflict ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4" role="alert">
          <p className="text-sm text-amber-950">{sectionConflict}</p>
        </div>
      ) : null}

      {newSectionOpen && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
          <Input
            label="Nueva sección"
            name="new-section"
            value={newSectionName}
            onChange={(e) => setNewSectionName(e.target.value)}
            error={sectionError}
          />
          <div className="mt-3 flex gap-2">
            <Button type="button" className="min-h-11" onClick={() => void handleCreateSection()}>
              Crear
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="min-h-11"
              onClick={() => {
                setNewSectionOpen(false);
                setSectionError("");
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {sections.length === 0 && (
        <EmptyState
          icon={<Folder size={48} aria-hidden />}
          title="Aún no hay secciones"
          description="Crea una para agrupar tu catálogo. No se anidan."
          action={
            <Button type="button" className="min-h-11" onClick={() => setNewSectionOpen(true)}>
              Nueva sección
            </Button>
          }
        />
      )}

      {groups.map((group) => {
        if (!group.section) {
          return (
            <section key="sin-seccion" className="mb-8 rounded-xl border border-gray-200 bg-white">
              <header className="border-b border-gray-100 px-4 py-3">
                <h2 className="text-lg font-semibold text-slate-900">Sin sección</h2>
              </header>
              <div className="divide-y divide-gray-100">{group.items.map(renderRow)}</div>
            </section>
          );
        }
        const index = sections.findIndex((s) => s.id === group.section?.id);
        return (
          <SectionBlock
            key={group.section.id}
            section={group.section}
            productCount={group.items.length}
            isFirst={index <= 0}
            isLast={index === sections.length - 1}
            onRename={async (name) => {
              await patchSection(group.section!.id, { name });
              await onReload();
            }}
            onMoveUp={() => void moveSection(group.section!.id, -1)}
            onMoveDown={() => void moveSection(group.section!.id, 1)}
            onDelete={async () => {
              try {
                await deleteSection(group.section!.id);
                setSectionConflict("");
                await onReload();
              } catch (err) {
                if (err instanceof ApiError && err.status === 409) {
                  setSectionConflict(
                    err.message || "La sección tiene productos. Muévelos antes de eliminarla"
                  );
                  setSectionError("");
                } else {
                  setSectionError(mapF10ApiError(err, "business"));
                }
              }
            }}
          >
            <div className="divide-y divide-gray-100">
              {group.items.length === 0 ? (
                <p className="px-5 py-4 text-sm text-slate-500">Sin productos en esta sección.</p>
              ) : (
                group.items.map(renderRow)
              )}
            </div>
          </SectionBlock>
        );
      })}

      {imageItem?.providerProductId && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Cerrar"
            onClick={() => setImageTarget(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-lg"
          >
            <ProductImageDropzone
              label={`Foto — ${imageItem.product.name}`}
              currentUrl={imageItem.imageUrl ?? imageItem.product.imageUrl ?? null}
              category={imageItem.product.category ?? undefined}
              onUpload={async (file) => {
                const { data } = await uploadProviderProductImage(
                  imageItem.providerProductId!,
                  file
                );
                await onReload();
                return data.url;
              }}
            />
            <Button
              type="button"
              variant="secondary"
              className="mt-4 min-h-11"
              onClick={() => setImageTarget(null)}
            >
              Cerrar
            </Button>
          </div>
        </div>
      )}

      <ProductFormDrawer
        open={drawerOpen}
        sections={sections}
        editing={editing}
        onClose={() => {
          setDrawerOpen(false);
          setEditing(null);
        }}
        onSaved={onReload}
      />
      <ArchivedTray
        items={archived}
        loading={archivedLoading}
        error={archivedError}
        onRetry={() => void onReloadArchived()}
        restoringId={restoringId}
        onRestore={async (item) => {
          setRestoringId(item.product.id);
          try {
            await restoreProviderProduct(item.product.id);
            await Promise.all([onReload(), onReloadArchived()]);
          } finally {
            setRestoringId(null);
          }
        }}
      />
      <ConfirmDialog
        open={Boolean(archiveTarget)}
        title="Quitar de tu catálogo"
        description="Se oculta de tu catálogo. El administrador sigue viendo el producto."
        confirmLabel="Quitar de catálogo"
        onCancel={() => setArchiveTarget(null)}
        onConfirm={() => {
          const item = archiveTarget;
          setArchiveTarget(null);
          if (!item) return;
          void archiveProviderProduct(item.product.id).then(() =>
            Promise.all([onReload(), onReloadArchived()])
          );
        }}
      />
      <PriceRequiredDialog
        open={Boolean(priceTarget)}
        productName={priceTarget?.product.name ?? ""}
        busy={priceBusy}
        apiError={priceApiError}
        onCancel={() => {
          setPriceTarget(null);
          setPriceApiError("");
        }}
        onConfirm={async (price) => {
          const item = priceTarget;
          if (!item) return;
          setPriceBusy(true);
          setPriceApiError("");
          try {
            if (item.scope === "LOCAL" && item.providerProductId) {
              await patchLocalProduct(item.providerProductId, { isAvailable: true, price });
            } else {
              await updateProduct({
                productId: item.product.id,
                isAvailable: true,
                price,
              });
            }
            await onReload();
            setPriceTarget(null);
          } catch (err) {
            setPriceApiError(mapF10ApiError(err, "business"));
          } finally {
            setPriceBusy(false);
          }
        }}
      />
      {historyItem ? (
        <PriceHistoryList
          name={historyItem.product.name}
          rows={historyRows}
          loading={historyLoading}
          error={historyError}
          empty={!historyLoading && !historyError && historyRows.length === 0}
          onRetry={() => void loadHistory(historyItem)}
          onClose={() => setHistoryItem(null)}
        />
      ) : null}
    </div>
  );
}
