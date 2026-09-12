"use client";

import { useEffect, useState } from "react";
import type { AdminProduct } from "@/lib/api/types";
import {
  createAdminProduct,
  getAdminProducts,
  patchAdminProduct,
  uploadAdminProductImage,
} from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { mapF10ApiError } from "@/lib/ui/f10-errors";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SkeletonTable } from "@/components/ui/SkeletonCard";
import { MediaUpload } from "@/components/ui/MediaUpload";

const CATEGORIES = ["FRUTA", "VERDURA", "AGRICOLA"] as const;
const UNITS = ["KG", "PIEZA", "MANOJO", "CAJA", "LITRO", "GRAMO"] as const;

const emptyForm = {
  name: "",
  slug: "",
  description: "",
  category: "FRUTA" as (typeof CATEGORIES)[number],
  unit: "KG" as (typeof UNITS)[number],
  isActive: true,
};

export function AdminProductForm() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    setError("");
    try {
      const { data } = await getAdminProducts({ limit: 100 });
      setProducts(data);
    } catch (err) {
      setError(mapF10ApiError(err, "module"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function startNew() {
    setSelectedId(null);
    setForm(emptyForm);
    setImageUrl(null);
    setFieldErrors({});
  }

  function startEdit(product: AdminProduct) {
    setSelectedId(product.id);
    setForm({
      name: product.name,
      slug: product.slug,
      description: product.description ?? "",
      category: (CATEGORIES.includes(product.category as (typeof CATEGORIES)[number])
        ? product.category
        : "FRUTA") as (typeof CATEGORIES)[number],
      unit: (UNITS.includes(product.unit as (typeof UNITS)[number])
        ? product.unit
        : "KG") as (typeof UNITS)[number],
      isActive: product.isActive,
    });
    setImageUrl(product.imageUrl);
    setFieldErrors({});
  }

  async function save() {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Indica un nombre";
    setFieldErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    setError("");
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        description: form.description.trim() || null,
        category: form.category,
        unit: form.unit,
        isActive: form.isActive,
      };
      if (selectedId) {
        const { data } = await patchAdminProduct(selectedId, payload);
        setProducts((prev) => prev.map((p) => (p.id === data.id ? data : p)));
        setImageUrl(data.imageUrl);
      } else {
        const { data } = await createAdminProduct(payload);
        setProducts((prev) => [data, ...prev]);
        setSelectedId(data.id);
        setImageUrl(data.imageUrl);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setFieldErrors({ slug: "Ya existe un producto con ese identificador" });
      } else {
        setError(mapF10ApiError(err, "module"));
      }
    } finally {
      setSaving(false);
    }
  }

  async function inhabilitar() {
    if (!selectedId) return;
    setSaving(true);
    try {
      const { data } = await patchAdminProduct(selectedId, { isActive: false });
      setProducts((prev) => prev.map((p) => (p.id === data.id ? data : p)));
      setForm((prev) => ({ ...prev, isActive: false }));
    } catch (err) {
      setError(mapF10ApiError(err, "module"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2 className="font-semibold">Catálogo global</h2>
          <Button type="button" variant="secondary" className="min-h-11" onClick={startNew}>
            Nuevo
          </Button>
        </div>
        {loading ? (
          <div className="p-6">
            <SkeletonTable rows={5} />
          </div>
        ) : products.length === 0 ? (
          <div className="p-6">
            <EmptyState title="Sin productos" description="Crea el primer SKU comparable." />
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {products.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => startEdit(p)}
                  className={`flex min-h-11 w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-gray-50 ${
                    selectedId === p.id ? "bg-orange-50" : ""
                  }`}
                >
                  <span>
                    <span className="font-medium">{p.name}</span>
                    <span className="ml-2 text-xs text-slate-500">
                      {p.category} · {p.unit}
                    </span>
                  </span>
                  <span className={p.isActive ? "text-green-700" : "text-slate-500"}>
                    {p.isActive ? "Activo" : "Inactivo"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form
        className="space-y-4 rounded-xl border border-gray-200 bg-white p-6"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <h2 className="font-semibold">{selectedId ? "Editar producto" : "Alta de producto"}</h2>
        {error && <ErrorBanner message={error} />}
        <Input
          label="Nombre"
          name="admin-name"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          error={fieldErrors.name}
          required
        />
        <Input
          label="Slug (opcional)"
          name="admin-slug"
          value={form.slug}
          onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
          error={fieldErrors.slug}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="admin-category" className="mb-1 block text-sm font-medium">
              Categoría
            </label>
            <select
              id="admin-category"
              value={form.category}
              onChange={(e) =>
                setForm((p) => ({ ...p, category: e.target.value as (typeof CATEGORIES)[number] }))
              }
              className="min-h-11 w-full rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="admin-unit" className="mb-1 block text-sm font-medium">
              Unidad
            </label>
            <select
              id="admin-unit"
              value={form.unit}
              onChange={(e) =>
                setForm((p) => ({ ...p, unit: e.target.value as (typeof UNITS)[number] }))
              }
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
          <label htmlFor="admin-desc" className="mb-1 block text-sm font-medium">
            Descripción
          </label>
          <textarea
            id="admin-desc"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          />
        </div>
        {selectedId && (
          <MediaUpload
            label="Imagen"
            hint="JPEG, PNG o WebP · máx 5MB"
            variant="product"
            category={form.category}
            currentUrl={imageUrl}
            onUpload={async (file) => {
              const { data } = await uploadAdminProductImage(selectedId, file);
              setImageUrl(data.url);
              setProducts((prev) =>
                prev.map((p) => (p.id === selectedId ? { ...p, imageUrl: data.url } : p))
              );
              return data.url;
            }}
          />
        )}
        <p className="text-sm text-slate-600">
          Inhabilitar oculta el SKU a nuevas activaciones. No se borra el historial.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" loading={saving} className="min-h-11">
            Guardar
          </Button>
          {selectedId && form.isActive && (
            <Button
              type="button"
              variant="secondary"
              className="min-h-11"
              onClick={() => void inhabilitar()}
            >
              Inhabilitar
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
