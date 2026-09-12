"use client";

import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ScopeBadge } from "./ScopeBadge";
import { ProductImageDropzone } from "./ProductImageDropzone";
import type { CatalogItem, ProviderSection } from "@/lib/api/types";
import {
  createLocalProduct,
  patchLocalProduct,
  uploadProviderProductImage,
} from "@/lib/api/provider-panel";
import { ApiError } from "@/lib/api/client";
import { mapF10ApiError } from "@/lib/ui/f10-errors";

const UNITS = ["KG", "PIEZA"] as const;

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
  const [unit, setUnit] = useState<(typeof UNITS)[number]>("KG");
  const [sectionId, setSectionId] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(editing?.providerProductId && editing.scope === "LOCAL");

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setPendingFile(null);
    if (editing && editing.scope === "LOCAL") {
      setName(editing.product.name);
      setPrice(editing.price != null ? String(editing.price) : "");
      setUnit(editing.product.unit === "PIEZA" ? "PIEZA" : "KG");
      setSectionId(editing.sectionId ?? sections[0]?.id ?? "");
      setIsAvailable(editing.isAvailable);
      setImageUrl(editing.imageUrl ?? editing.product.imageUrl ?? null);
    } else {
      setName("");
      setPrice("");
      setUnit("KG");
      setSectionId(sections[0]?.id ?? "");
      setIsAvailable(true);
      setImageUrl(null);
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

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Indica un nombre";
    const parsed = Number(price);
    if (!Number.isFinite(parsed) || parsed < 0 || Math.round(parsed * 100) !== parsed * 100) {
      next.price = "Indica un precio válido";
    }
    if (!sectionId) next.sectionId = "Elige una sección";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        unit,
        price: Number(price),
        sectionId,
        isAvailable,
      };
      let providerProductId = editing?.providerProductId ?? null;
      if (isEdit && providerProductId) {
        await patchLocalProduct(providerProductId, payload);
      } else {
        const { data } = await createLocalProduct(payload);
        providerProductId = data.providerProductId;
      }
      const file = pendingFile;
      if (file && providerProductId) {
        const { data } = await uploadProviderProductImage(providerProductId, file);
        setImageUrl(data.url);
        setPendingFile(null);
      }
      await onSaved();
      onClose();
    } catch (err) {
      const field = err instanceof ApiError ? err.details?.[0]?.field : undefined;
      setErrors({
        [field && ["name", "price", "sectionId"].includes(field) ? field : "form"]:
          mapF10ApiError(err, "business"),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Cerrar"
        onClick={onClose}
      />
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
              Producto de tu frutería
            </h2>
            <div className="mt-1">
              <ScopeBadge scope="LOCAL" />
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
          <Input
            label="Nombre"
            name="local-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            error={errors.name}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Precio (MXN)"
              name="local-price"
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              error={errors.price}
            />
            <div>
              <label htmlFor="local-unit" className="mb-1 block text-sm font-medium">
                Unidad
              </label>
              <select
                id="local-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value as (typeof UNITS)[number])}
                className="min-h-11 w-full rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="local-section" className="mb-1 block text-sm font-medium">
              Sección
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
          <ProductImageDropzone
            currentUrl={imageUrl}
            onUpload={async (file) => {
              if (isEdit && editing?.providerProductId) {
                const { data } = await uploadProviderProductImage(editing.providerProductId, file);
                setImageUrl(data.url);
                return data.url;
              }
              setPendingFile(file);
              return URL.createObjectURL(file);
            }}
          />
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
          <p className="text-sm text-slate-600">
            Solo este negocio — no aparece en otras fruterías
          </p>
          {errors.form && (
            <p className="text-sm text-red-600" role="alert">
              {errors.form}
            </p>
          )}
        </div>

        <footer className="border-t border-gray-100 p-5">
          <Button
            type="button"
            onClick={() => void handleSave()}
            loading={saving}
            loadingText="Guardando…"
            className="min-h-11 w-full"
          >
            Guardar producto
          </Button>
        </footer>
      </div>
    </div>
  );
}
