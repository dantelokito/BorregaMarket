"use client";

import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ScopeBadge } from "./ScopeBadge";
import { OfferUnitSelect, BoxFactorField } from "./OfferUnitSelect";
import {
  ActiveOrderBlockAlert,
  UnitChangeConfirmDialog,
} from "./UnitChangeConfirmDialog";
import type { CatalogItem, ProviderSection } from "@/lib/api/types";
import { createLocalProduct, patchLocalProduct } from "@/lib/api/provider-panel";
import { patchOfferByProduct } from "@/lib/api/provider-f13";
import { ApiError } from "@/lib/api/client";
import { mapF10ApiError } from "@/lib/ui/f10-errors";
import { offerPatchSchema } from "@/lib/validators/catalog-f13";
import {
  effectiveSaleUnit,
  factorRequired,
  isConfirmDiscardRequired,
  isEncargarActiveError,
  onHandIsNonZero,
  reservedIsPositive,
  unitOrFactorChanged,
} from "@/lib/catalog/f13";

export function ProductFormDrawer({
  open,
  sections,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean;
  sections: ProviderSection[];
  editing: CatalogItem | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [saleUnit, setSaleUnit] = useState("KG");
  const [factor, setFactor] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [encargarOpen, setEncargarOpen] = useState(false);

  const isGlobalEdit = Boolean(editing && editing.scope !== "LOCAL");
  const isLocalEdit = Boolean(editing && editing.scope === "LOCAL");
  const isCreate = !editing;

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setDiscardOpen(false);
    if (editing) {
      setName(editing.product.name);
      setPrice(editing.price != null ? String(editing.price) : "");
      setSaleUnit(effectiveSaleUnit(editing.saleUnit, editing.product.unit));
      setFactor(editing.boxContentFactor ? String(Number(editing.boxContentFactor)) : "");
      setSectionId(editing.sectionId ?? sections[0]?.id ?? "");
      setIsAvailable(editing.isAvailable);
    } else {
      setName("");
      setPrice("");
      setSaleUnit("KG");
      setFactor("");
      setSectionId(sections[0]?.id ?? "");
      setIsAvailable(true);
    }
  }, [open, editing, sections]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const caja = factorRequired(saleUnit);

  function validate(): boolean {
    const parsed = offerPatchSchema.safeParse({
      name: isGlobalEdit ? undefined : name.trim(),
      price: isCreate || price !== "" ? price : undefined,
      saleUnit,
      boxContentFactor: caja ? factor : factor || null,
      sectionId: isGlobalEdit ? sectionId || null : sectionId,
      unit: isCreate || isLocalEdit ? saleUnit : undefined,
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        next[key] = issue.message;
      }
      if (!isGlobalEdit && !name.trim()) next.name = "Indica un nombre";
      if ((isCreate || isLocalEdit) && !sectionId) next.sectionId = "Elige una sección";
      setErrors(next);
      return false;
    }
    const next: Record<string, string> = {};
    if (!isGlobalEdit && !name.trim()) next.name = "Indica un nombre";
    if ((isCreate || isLocalEdit) && !sectionId) next.sectionId = "Elige una sección";
    if (isCreate && (!price.trim() || Number(price) < 0)) next.price = "Indica un precio válido";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function persist(confirmDiscard: boolean) {
    setSaving(true);
    try {
      if (isCreate) {
        await createLocalProduct({
          name: name.trim(),
          unit: saleUnit as "KG",
          price: Number(price),
          sectionId,
          isAvailable,
          boxContentFactor: caja ? factor : null,
        });
      } else if (isLocalEdit && editing) {
        await patchLocalProduct(editing.product.id, {
          name: name.trim(),
          unit: saleUnit as "KG",
          saleUnit: saleUnit as "KG",
          price: price === "" ? undefined : Number(price),
          sectionId: sectionId || undefined,
          isAvailable,
          boxContentFactor: caja ? factor : null,
          confirmDiscard: confirmDiscard || undefined,
        });
      } else if (editing) {
        await patchOfferByProduct(editing.product.id, {
          price: price === "" ? undefined : Number(price).toFixed(2),
          saleUnit,
          boxContentFactor: caja ? factor : null,
          sectionId: sectionId || null,
          isAvailable,
          confirmDiscard: confirmDiscard || undefined,
        });
      }
      await onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && isEncargarActiveError(err.status, err.details)) {
        setEncargarOpen(true);
      } else if (err instanceof ApiError && isConfirmDiscardRequired(err.status, err.details, err.message)) {
        setDiscardOpen(true);
      } else {
        setErrors({ form: mapF10ApiError(err, "business") });
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    if (!validate()) return;
    const unitChanged =
      editing &&
      unitOrFactorChanged({
        prevSaleUnit: effectiveSaleUnit(editing.saleUnit, editing.product.unit),
        nextSaleUnit: saleUnit,
        prevFactor: editing.boxContentFactor,
        nextFactor: caja ? factor : null,
      });
    if (editing && unitChanged && reservedIsPositive(editing.reserved)) {
      setEncargarOpen(true);
      return;
    }
    if (editing && unitChanged && onHandIsNonZero(editing.onHand)) {
      setDiscardOpen(true);
      return;
    }
    await persist(false);
  }

  const title = isGlobalEdit
    ? `Editar oferta · ${editing?.product.name ?? ""}`
    : isLocalEdit
      ? "Editar producto (solo este negocio)"
      : "Agregar producto (solo este negocio)";

  return (
    <div className="fixed inset-0 z-[80]">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Cerrar" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute inset-0 flex flex-col bg-white md:inset-y-0 md:right-0 md:left-auto md:w-[400px] md:shadow-xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-slate-900">
              {title}
            </h2>
            <div className="mt-1">
              <ScopeBadge scope={isGlobalEdit ? "GLOBAL" : "LOCAL"} />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            aria-label="Cerrar"
          >
            <X size={20} aria-hidden />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {isGlobalEdit ? (
            <>
              <p className="text-sm text-slate-600">
                Unidad y factor de TU frutería. No cambia el catálogo del administrador.
              </p>
              <p className="text-sm text-slate-500">
                Maestro (solo lectura): {editing?.product.unit}
              </p>
            </>
          ) : (
            <Input
              label="Nombre"
              name="local-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              error={errors.name}
            />
          )}
          {(isCreate || isLocalEdit) && (
            <Input
              label="Precio de tu frutería"
              name="local-price"
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required={isCreate}
              error={errors.price}
            />
          )}
          {isGlobalEdit && (
            <Input
              label="Precio de tu frutería"
              name="offer-price"
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              error={errors.price}
            />
          )}
          <OfferUnitSelect
            id="offer-unit"
            value={saleUnit}
            onChange={setSaleUnit}
            label={isGlobalEdit ? "Unidad de tu oferta" : "Unidad"}
          />
          <BoxFactorField
            id="offer-factor"
            value={factor}
            onChange={setFactor}
            required={caja}
            error={errors.boxContentFactor}
          />
          <div>
            <label htmlFor="local-section" className="mb-1 block text-sm font-medium">
              Sección {isCreate || isLocalEdit ? "*" : ""}
            </label>
            <select
              id="local-section"
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              className={`min-h-11 w-full rounded-lg border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)] ${
                errors.sectionId ? "border-red-500" : "border-gray-300"
              }`}
            >
              <option value="">Elige una sección</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {errors.sectionId && (
              <p className="mt-1 text-sm text-red-600" role="alert">
                {errors.sectionId}
              </p>
            )}
          </div>
          <button
            type="button"
            aria-pressed={isAvailable}
            onClick={() => setIsAvailable((v) => !v)}
            className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--brand)] ${
              isAvailable ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
            }`}
          >
            {isAvailable ? "Activo" : "Inactivo"}
          </button>
          {errors.form && (
            <p className="text-sm text-red-600" role="alert">
              {errors.form}
            </p>
          )}
        </div>

        <footer className="flex gap-2 border-t border-gray-100 p-5">
          <Button type="button" variant="secondary" className="min-h-11 w-full" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            loading={saving}
            loadingText="Guardando…"
            className="min-h-11 w-full"
          >
            {isGlobalEdit ? "Guardar oferta" : "Guardar producto"}
          </Button>
        </footer>
      </div>
      <UnitChangeConfirmDialog
        open={discardOpen}
        onCancel={() => setDiscardOpen(false)}
        onConfirm={() => {
          setDiscardOpen(false);
          void persist(true);
        }}
      />
      <ActiveOrderBlockAlert open={encargarOpen} onClose={() => setEncargarOpen(false)} />
    </div>
  );
}
