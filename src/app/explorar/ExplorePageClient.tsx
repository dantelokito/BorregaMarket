"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FilterBar } from "@/components/explore/FilterBar";
import { ProviderCard } from "@/components/explore/ProviderCard";
import { ExploreMap } from "@/components/explore/ExploreMap";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Button } from "@/components/ui/Button";
import { getProviders, type ProviderCategory } from "@/lib/api/providers";
import { ApiError } from "@/lib/api/client";
import type { ProviderListing } from "@/lib/api/types";
import { CHIP_TO_CATEGORY } from "@/types";

function ExploreMapSection({
  providers,
  hoveredId,
  setHoveredId,
  loading,
  className = "",
}: {
  providers: ProviderListing[];
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
  loading: boolean;
  className?: string;
}) {
  if (loading) {
    return <div className={`animate-pulse bg-gray-200 ${className}`} />;
  }

  return (
    <ExploreMap
      providers={providers}
      hoveredId={hoveredId}
      onMarkerHover={setHoveredId}
      onMarkerLeave={() => setHoveredId(null)}
    />
  );
}

function categoryFromParams(searchParams: URLSearchParams): string | null {
  const raw = searchParams.get("category");
  if (raw === "FRUTA" || raw === "VERDURA" || raw === "AGRICOLA") return raw;
  return null;
}

function chipIdFromCategory(category: string | null): string | null {
  if (category === "FRUTA") return "frutas";
  if (category === "VERDURA") return "verduras";
  if (category === "AGRICOLA") return "agricola";
  return null;
}

function ExploreContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const qRaw = searchParams.get("q") ?? "";
  const q = qRaw.trim().length >= 2 ? qRaw.trim() : "";
  const page = Number(searchParams.get("page") ?? "1") || 1;
  const verified = searchParams.get("verified") === "true";
  const categoryParam = categoryFromParams(searchParams);
  const categoryChip = chipIdFromCategory(categoryParam);

  const activeFilters: string[] = [];
  if (verified) activeFilters.push("verificado");
  if (categoryChip) activeFilters.push(categoryChip);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [providers, setProviders] = useState<ProviderListing[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data, meta } = await getProviders({
        q: q || undefined,
        page,
        limit: 12,
        verified: verified || undefined,
        category: (categoryParam as ProviderCategory) || undefined,
      });
      setProviders(data);
      setTotalPages(meta?.totalPages ?? 1);
      setTotal(meta?.total ?? data.length);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Error al cargar fruterías");
      }
      setProviders([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [q, page, verified, categoryParam]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  function pushParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const qs = params.toString();
    router.push(qs ? `/explorar?${qs}` : "/explorar");
  }

  function toggleFilter(id: string) {
    if (id === "verificado") {
      pushParams((params) => {
        if (verified) params.delete("verified");
        else params.set("verified", "true");
        params.delete("page");
      });
      return;
    }

    const mapped = CHIP_TO_CATEGORY[id];
    if (!mapped) return;

    pushParams((params) => {
      if (categoryParam === mapped) {
        params.delete("category");
      } else {
        params.set("category", mapped);
      }
      params.delete("page");
    });
  }

  function goToPage(newPage: number) {
    pushParams((params) => {
      params.set("page", String(newPage));
    });
  }

  function clearFilters() {
    router.push("/explorar");
  }

  const hasFilters = Boolean(q || verified || categoryParam);

  return (
    <>
      <FilterBar activeFilters={activeFilters} onToggle={toggleFilter} />

      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <div className="overflow-y-auto px-6 py-6 lg:w-[55%] xl:w-[58%]">
          {!loading && !error && (
            <p className="mb-5 text-sm text-gray-600">
              {total > 0
                ? `${total} frutería${total !== 1 ? "s" : ""} en Monterrey`
                : "Sin resultados"}
              {q && ` para "${q}"`}
              {categoryParam && ` · ${categoryParam}`}
              {verified && " · verificadas"}
            </p>
          )}

          {error && (
            <div className="mb-6">
              <ErrorBanner message={error} onRetry={fetchProviders} />
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : providers.length === 0 && !error ? (
            <EmptyState
              title="No encontramos fruterías"
              description={
                hasFilters
                  ? "Intenta ajustar los filtros o buscar con otros términos."
                  : "Aún no hay fruterías publicadas en esta zona."
              }
              action={
                hasFilters ? (
                  <Button variant="secondary" onClick={clearFilters}>
                    Limpiar filtros
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div
              className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3"
              role="list"
              aria-label="Lista de fruterías"
            >
              {providers.map((provider) => (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  isHovered={hoveredId === provider.id}
                  onHover={() => setHoveredId(provider.id)}
                  onLeave={() => setHoveredId(null)}
                />
              ))}
            </div>
          )}

          {!loading && totalPages > 1 && !error && (
            <div className="mt-10 flex items-center justify-center gap-2 pb-6">
              {Array.from({ length: totalPages }).map((_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                      pageNum === page
                        ? "border border-gray-900 font-medium"
                        : "text-gray-600 hover:border hover:border-gray-300"
                    }`}
                    aria-label={`Página ${pageNum}`}
                    aria-current={pageNum === page ? "page" : undefined}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="sticky top-[130px] hidden h-[calc(100vh-130px)] lg:block lg:w-[45%] xl:w-[42%]">
          <ExploreMapSection
            providers={providers}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
            loading={loading}
            className="h-full"
          />
        </div>
      </div>

      {/* Mobile map — OBS-01 */}
      <div className="h-[300px] w-full px-6 pb-6 lg:hidden">
        <ExploreMapSection
          providers={providers}
          hoveredId={hoveredId}
          setHoveredId={setHoveredId}
          loading={loading}
          className="h-full overflow-hidden rounded-xl"
        />
      </div>
    </>
  );
}

export function ExplorePageClient() {
  return (
    <Suspense
      fallback={
        <div className="grid grid-cols-1 gap-6 px-6 py-6 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      }
    >
      <ExploreContent />
    </Suspense>
  );
}
