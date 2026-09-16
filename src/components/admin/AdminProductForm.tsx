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
import { deleteNotAllowedCopy } from "@/lib/catalog/f13";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SkeletonTable } from "@/components/ui/SkeletonCard";
import { MediaUpload } from "@/components/ui/MediaUpload";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { AdminProductTableF13 } from "./AdminProductTableF13";
import { PaginationBar } from "./PaginationBar";

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
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<"" | "GLOBAL" | "LOCAL">("");
  const [isActive, setIsActive] = useState<"" | "true" | "false">("");
  const [ownerProviderId, setOwnerProviderId] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<50 | 100>(50);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [confirmTarget, setConfirmTarget] = useState<AdminProduct | null>(null);

  const selected = products.find((p) => p.id === selectedId) ?? null;
  const selectedIsLocal = selected?.scope === "LOCAL";

  async function load() {
    setLoading(true);
    setError("");
    try {
      const { data, meta } = await getAdminProducts({
        q: q.trim() || undefined,
        isActive: isActive === "" ? undefined : isActive === "true",
        page,
        limit,
        scope: scope || undefined,
        ownerProviderId: scope === "LOCAL" && ownerProviderId.trim() ? ownerProviderId.trim() : undefined,
      });
      setProducts(data);
      setTotal(meta?.total ?? data.length);
      setTotalPages(meta?.totalPages ?? 1);
    } catch (err) {
      if (err instanceof ApiError && err.status === 405) {
        setError(deleteNotAllowedCopy(405) ?? mapF10ApiError(err, "module"));
      } else {
        setError(mapF10ApiError(err, "module"));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, scope, isActive]);

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
    if (selectedIsLocal) return;
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
      } else if (err instanceof ApiError && err.status === 405) {
        setError(deleteNotAllowedCopy(405) ?? mapF10ApiError(err, "module"));
      } else {
        setError(mapF10ApiError(err, "module"));
      }
    } finally {
      setSaving(false);
    }
  }

  async function applyActive(product: AdminProduct) {
    setSaving(true);
    try {
      const { data } = await patchAdminProduct(product.id, { isActive: !product.isActive });
      setProducts((prev) => prev.map((p) => (p.id === data.id ? data : p)));
      if (selectedId === data.id) {
        setForm((prev) => ({ ...prev, isActive: data.isActive }));
      }
    } catch (err) {
      setError(mapF10ApiError(err, "module"));
    } finally {
      setSaving(false);
      setConfirmTarget(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <Input
          label="Buscar"
          name="admin-q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setPage(1);
              void load();
            }
          }}
        />
        <label className="text-sm">
          Scope
          <select
            className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 px-2"
            value={scope}
            onChange={(e) => {
              setScope(e.target.value as typeof scope);
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            <option value="GLOBAL">GLOBAL</option>
            <option value="LOCAL">LOCAL</option>
          </select>
        </label>
        <label className="text-sm">
          Estado
          <select
            className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 px-2"
            value={isActive}
            onChange={(e) => {
              setIsActive(e.target.value as typeof isActive);
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            <option value="true">Activo</option>
            <option value="false">Inactivo</option>
          </select>
        </label>
        {scope === "LOCAL" ? (
          <Input
            label="Dueño (id sucursal)"
            name="owner"
            value={ownerProviderId}
            onChange={(e) => setOwnerProviderId(e.target.value)}
          />
        ) : null}
        <Button
          type="button"
          variant="secondary"
          className="min-h-11"
          onClick={() => {
            setPage(1);
            void load();
          }}
        >
          Filtrar
        </Button>
        <Button type="button" className="min-h-11" onClick={startNew}>
          Nuevo producto
        </Button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        {error && !loading ? (
          <div className="p-4">
            <ErrorBanner message={error} onRetry={() => void load()} />
          </div>
        ) : null}
        {loading ? (
          <div className="p-6">
            <SkeletonTable rows={8} />
          </div>
        ) : products.length === 0 && !error ? (
          <div className="p-6">
            <EmptyState
              title="No hay productos con estos filtros."
              description="Limpia los filtros o crea un SKU GLOBAL."
              action={
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-11"
                  onClick={() => {
                    setQ("");
                    setScope("");
                    setIsActive("");
                    setOwnerProviderId("");
                    setPage(1);
                    void load();
                  }}
                >
                  Limpiar filtros
                </Button>
              }
            />
          </div>
        ) : !error ? (
          <AdminProductTableF13
            products={products}
            selectedId={selectedId}
            onSelect={startEdit}
            onToggleActive={(p) => setConfirmTarget(p)}
          />
        ) : null}
        {!loading && !error ? (
          <PaginationBar
            page={page}
            totalPages={totalPages}
            total={total}
            limit={limit}
            onPage={setPage}
            onLimit={(next) => {
              setLimit(next);
              setPage(1);
            }}
          />
        ) : null}
      </div>

      <form
        className="space-y-4 rounded-xl border border-gray-200 bg-white p-6"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <h2 className="font-semibold">
          {selectedIsLocal
            ? "Moderación LOCAL (solo estado)"
            : selectedId
              ? "Editar producto GLOBAL"
              : "Alta de producto GLOBAL"}
        </h2>
        {selectedIsLocal ? (
          <p className="text-sm text-slate-600">
            El administrador no edita nombre, precio ni unidad de un SKU LOCAL. Usa Inhabilitar /
            Reactivar en la tabla.
          </p>
        ) : (
          <>
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
              Inhabilitar oculta el SKU a nuevas activaciones. No se borra el historial. DELETE no está
              permitido.
            </p>
            <Button type="submit" loading={saving} className="min-h-11">
              Guardar
            </Button>
          </>
        )}
      </form>

      <ConfirmDialog
        open={Boolean(confirmTarget)}
        title={confirmTarget?.isActive ? "Inhabilitar producto" : "Reactivar producto"}
        description={
          confirmTarget?.isActive
            ? "Dejará de ser vendible. No se elimina de la base."
            : "El SKU volverá a poder venderse si cumple el resto de reglas."
        }
        confirmLabel={confirmTarget?.isActive ? "Inhabilitar" : "Reactivar"}
        onCancel={() => setConfirmTarget(null)}
        onConfirm={() => {
          if (confirmTarget) void applyActive(confirmTarget);
        }}
      />
    </div>
  );
}
