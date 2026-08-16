"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getMyBusiness,
  getMyProducts,
  updateProduct,
  uploadProviderMedia,
} from "@/lib/api/provider-panel";
import { ApiError } from "@/lib/api/client";
import type { CatalogItem } from "@/lib/api/types";
import { OnboardingCTA } from "@/components/provider/OnboardingCTA";
import { PriceInput } from "@/components/provider/PriceInput";
import { ProviderSettingsForm } from "@/components/provider/ProviderSettingsForm";
import { MediaUpload } from "@/components/ui/MediaUpload";
import { SkeletonTable } from "@/components/ui/SkeletonCard";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Check, LoaderCircle, ToggleLeft, ToggleRight } from "lucide-react";
import { BrandColorPicker } from "@/components/provider/BrandColorPicker";

export function ProveedorPageClient() {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [businessName, setBusinessName] = useState("");
  const [providerId, setProviderId] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [error, setError] = useState("");
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [rowBusy, setRowBusy] = useState<Record<string, boolean>>({});
  const [rowOk, setRowOk] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const { data: business } = await getMyBusiness();
        setProviderId(business.id);
        setBusinessName(business.businessName);
        setLogoUrl(business.logoUrl);
        setCoverUrl(business.coverUrl);

        const { data } = await getMyProducts();
        setCatalog(data.catalog);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setNeedsOnboarding(true);
        } else if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Error al cargar el panel");
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function toggleProduct(productId: string, current: boolean, price: number | null) {
    setRowErrors((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
    setRowBusy((prev) => ({ ...prev, [productId]: true }));

    try {
      const { data } = await updateProduct({
        productId,
        isAvailable: !current,
        price: price ?? 50,
      });
      setCatalog(data.catalog);
      setRowOk((prev) => ({ ...prev, [productId]: true }));
      window.setTimeout(() => {
        setRowOk((prev) => {
          const next = { ...prev };
          delete next[productId];
          return next;
        });
      }, 2000);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Error al guardar";
      setRowErrors((prev) => ({ ...prev, [productId]: message }));
    } finally {
      setRowBusy((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
    }
  }

  async function savePrice(productId: string, price: number, isAvailable: boolean) {
    setRowErrors((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });

    const { data } = await updateProduct({
      productId,
      isAvailable,
      price,
    });
    setCatalog(data.catalog);
  }

  const categories = ["FRUTA", "VERDURA", "AGRICOLA"] as const;
  const catLabels = { FRUTA: "🍎 Frutas", VERDURA: "🥬 Verduras", AGRICOLA: "🌾 Agrícola" };

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Panel Proveedor</h1>
          <p className="text-sm text-gray-500">
            {businessName || "Tu frutería"} — Activa productos y edita precios del catálogo global
          </p>
          {providerId && (
            <Link
              href={`/fruteria/${providerId}`}
              className="mt-2 inline-block text-sm font-medium text-[var(--brand)] hover:underline"
            >
              Ver mi negocio →
            </Link>
          )}
        </div>
        <Link href="/explorar" className="text-sm text-[var(--brand)] hover:underline">
          ← Ver explorador
        </Link>
      </div>

      {error && (
        <div className="mb-6">
          <ErrorBanner message={error} />
        </div>
      )}

      {loading ? (
        <SkeletonTable rows={8} />
      ) : needsOnboarding ? (
        <OnboardingCTA />
      ) : (
        <>
          <section className="mb-10 space-y-6 rounded-xl border border-gray-200 bg-white p-6">
            <div>
              <h2 className="text-lg font-semibold">Imágenes del negocio</h2>
              <p className="text-sm text-gray-500">
                JPEG, PNG o WebP · máximo 5MB. Portada recomendada 1200×600.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-2">
              <MediaUpload
                label="Logo"
                variant="logo"
                currentUrl={logoUrl}
                onUpload={async (file) => {
                  const { data } = await uploadProviderMedia("logo", file);
                  const { data: business } = await getMyBusiness();
                  const url = business.logoUrl ?? data.url;
                  setLogoUrl(url);
                  return url;
                }}
              />
              <MediaUpload
                label="Portada"
                hint="16:9 · ~1200×600"
                variant="cover"
                currentUrl={coverUrl}
                onUpload={async (file) => {
                  const { data } = await uploadProviderMedia("cover", file);
                  const { data: business } = await getMyBusiness();
                  const url = business.coverUrl ?? data.url;
                  setCoverUrl(url);
                  return url;
                }}
              />
            </div>
          </section>

          <BrandColorPicker />

          {catalog.length === 0 ? (
            <EmptyState
              title="Sin productos en el catálogo"
              description="No hay productos disponibles en el catálogo global. Contacta al administrador."
            />
          ) : (
            <>
              <p className="mb-4 text-sm text-slate-600">
                Inactivo: no aparece en explorar, pedidos ni POS. No es stock.
              </p>
              {categories.map((cat) => {
              const items = catalog.filter((c) => c.product.category === cat);
              if (items.length === 0) return null;

              return (
                <div key={cat} className="mb-8">
                  <h2 className="mb-4 text-lg font-semibold">{catLabels[cat]}</h2>
                  <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
                    {items.map((item) => (
                      <div
                        key={item.product.id}
                        className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-medium">{item.product.name}</p>
                          <PriceInput
                            value={item.price}
                            unit={item.product.unit}
                            onSave={(price) =>
                              savePrice(item.product.id, price, item.isAvailable)
                            }
                          />
                          {rowErrors[item.product.id] && (
                            <p className="mt-1 text-xs text-red-600" role="alert">
                              {rowErrors[item.product.id]}{" "}
                              <button
                                type="button"
                                className="underline"
                                onClick={() =>
                                  toggleProduct(item.product.id, item.isAvailable, item.price)
                                }
                              >
                                Reintentar
                              </button>
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            toggleProduct(item.product.id, item.isAvailable, item.price)
                          }
                          disabled={rowBusy[item.product.id]}
                          aria-label={`${item.product.name}: ${item.isAvailable ? "Activo" : "Inactivo"}`}
                          aria-pressed={item.isAvailable}
                          className={`flex min-h-[44px] min-w-[44px] items-center gap-2 self-start rounded-full px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand)] disabled:opacity-60 sm:self-center ${
                            item.isAvailable
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {rowBusy[item.product.id] ? (
                            <LoaderCircle size={18} className="animate-spin" aria-hidden />
                          ) : rowOk[item.product.id] ? (
                            <Check size={18} aria-hidden />
                          ) : item.isAvailable ? (
                            <ToggleRight size={18} aria-hidden />
                          ) : (
                            <ToggleLeft size={18} aria-hidden />
                          )}
                          {item.isAvailable ? "Activo" : "Inactivo"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            </>
          )}
          <ProviderSettingsForm />
        </>
      )}
    </div>
  );
}
