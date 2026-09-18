"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getMyBusiness, getMyProducts, listSections } from "@/lib/api/provider-panel";
import { ApiError } from "@/lib/api/client";
import type { CatalogItem, ProviderSection } from "@/lib/api/types";
import { OnboardingCTA } from "@/components/provider/OnboardingCTA";
import { SkeletonTable } from "@/components/ui/SkeletonCard";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { ProviderCatalogF10 } from "@/components/provider/catalog/ProviderCatalogF10";
import { mapF10ApiError } from "@/lib/ui/f10-errors";
import { ActiveStoreEyebrow } from "@/components/provider/ActiveStoreEyebrow";

export function ProveedorPageClient() {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [archived, setArchived] = useState<CatalogItem[]>([]);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [archivedError, setArchivedError] = useState("");
  const [sections, setSections] = useState<ProviderSection[]>([]);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [{ data: business }, { data: products }, sectionsRes] = await Promise.all([
      getMyBusiness(),
      getMyProducts(),
      listSections(),
    ]);
    setProviderId(business.id);
    setCatalog(products.catalog);
    setSections(sectionsRes.data);
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
        />
      )}
    </div>
  );
}
