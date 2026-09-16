"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  getMyBusiness,
  getMyProducts,
  listSections,
  updateProviderSettings,
  uploadProviderMedia,
} from "@/lib/api/provider-panel";
import { ApiError } from "@/lib/api/client";
import type { CatalogItem, ProviderSection } from "@/lib/api/types";
import { OnboardingCTA } from "@/components/provider/OnboardingCTA";
import { ProviderSettingsForm } from "@/components/provider/ProviderSettingsForm";
import { MediaUpload } from "@/components/ui/MediaUpload";
import { SkeletonTable } from "@/components/ui/SkeletonCard";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { BrandColorPicker } from "@/components/provider/BrandColorPicker";
import { ProviderCatalogF10 } from "@/components/provider/catalog/ProviderCatalogF10";
import { mapF10ApiError } from "@/lib/ui/f10-errors";
import { ActiveStoreEyebrow } from "@/components/provider/ActiveStoreEyebrow";

export function ProveedorPageClient() {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [archived, setArchived] = useState<CatalogItem[]>([]);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [archivedError, setArchivedError] = useState("");
  const [sections, setSections] = useState<ProviderSection[]>([]);
  const [businessName, setBusinessName] = useState("");
  const [providerId, setProviderId] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [error, setError] = useState("");
  const [posShowImages, setPosShowImages] = useState(true);
  const [posImagesBusy, setPosImagesBusy] = useState(false);
  const [posImagesError, setPosImagesError] = useState("");

  const load = useCallback(async () => {
    const [{ data: business }, { data: products }, sectionsRes] = await Promise.all([
      getMyBusiness(),
      getMyProducts(),
      listSections(),
    ]);
    setProviderId(business.id);
    setBusinessName(business.businessName);
    setLogoUrl(business.logoUrl);
    setCoverUrl(business.coverUrl);
    setCatalog(products.catalog);
    setSections(sectionsRes.data);
    setPosShowImages(business.posShowImages !== false);
    setArchivedLoading(true);
    setArchivedError("");
    try {
      const tray = await getMyProducts({ archived: true });
      setArchived(tray.data.catalog);
    } catch (err) {
      setArchived([]);
      setArchivedError(mapF10ApiError(err, "business"));
    } finally {
      setArchivedLoading(false);
    }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      setError("");
      try {
        await load();
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setNeedsOnboarding(true);
        } else if (err instanceof ApiError && err.status === 403) {
          setError(mapF10ApiError(err, "business"));
        } else if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Error al cargar el panel");
        }
      } finally {
        setLoading(false);
      }
    }
    void init();
  }, [load]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <ActiveStoreEyebrow />
          <h1 className="text-2xl font-bold">Catálogo</h1>
          <p className="text-sm text-gray-500">
            Activa el catálogo global o agrega productos solo de tu frutería.
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
              <h2 className="text-lg font-semibold">Imagen del negocio</h2>
              <p className="text-sm text-gray-500">JPEG, PNG o WebP · máx 5MB</p>
            </div>
            <div className="grid gap-8 md:grid-cols-2">
              <MediaUpload
                label="Logo"
                hint="JPEG, PNG o WebP · máx 5MB"
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
                hint="JPEG, PNG o WebP · máx 5MB"
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

          <ProviderCatalogF10
            catalog={catalog}
            sections={sections}
            onReload={load}
            archived={archived}
            archivedLoading={archivedLoading}
            archivedError={archivedError}
            onReloadArchived={async () => {
              setArchivedLoading(true);
              setArchivedError("");
              try {
                const tray = await getMyProducts({ archived: true });
                setArchived(tray.data.catalog);
              } catch (err) {
                setArchivedError(mapF10ApiError(err, "business"));
              } finally {
                setArchivedLoading(false);
              }
            }}
            posShowImages={posShowImages}
            posImagesBusy={posImagesBusy}
            posImagesError={posImagesError}
            onPosShowImagesChange={(next) => {
              const prev = posShowImages;
              setPosShowImages(next);
              setPosImagesError("");
              setPosImagesBusy(true);
              void updateProviderSettings({ posShowImages: next })
                .then(() => {
                  setPosImagesBusy(false);
                })
                .catch(() => {
                  setPosShowImages(prev);
                  setPosImagesBusy(false);
                  setPosImagesError("No se guardó la preferencia");
                });
            }}
          />
          <ProviderSettingsForm />
        </>
      )}
    </div>
  );
}
