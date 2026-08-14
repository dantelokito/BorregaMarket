"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { FilterBar } from "@/components/explore/FilterBar";
import { ProviderCard } from "@/components/explore/ProviderCard";
import { ExploreMap } from "@/components/explore/ExploreMap";
import { LocationBar } from "@/components/explore/LocationBar";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Button } from "@/components/ui/Button";
import { getProviders, clampRadiusKm, type ProviderCategory } from "@/lib/api/providers";
import { createAddress, listMyAddresses } from "@/lib/api/addresses";
import { ApiError } from "@/lib/api/client";
import type { ProviderListing, UserAddress } from "@/lib/api/types";
import { CHIP_TO_CATEGORY } from "@/types";
import {
  DEFAULT_RADIUS_KM,
  MAX_RADIUS_KM,
  getGoogleMapsApiKey,
  readExplorePin,
  writeExplorePin,
} from "@/lib/maps/constants";
import { GoogleMapsProvider } from "@/components/maps/GoogleMapsProvider";

function ExploreMapSection({
  providers,
  hoveredId,
  setHoveredId,
  loading,
  className = "",
  pin,
  radiusKm,
  onPinChange,
}: {
  providers: ProviderListing[];
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
  loading: boolean;
  className?: string;
  pin: { lat: number; lng: number } | null;
  radiusKm: number;
  onPinChange: (lat: number, lng: number) => void;
}) {
  if (loading) {
    return <div className={`animate-pulse bg-gray-200 ${className}`} />;
  }

  return (
    <div className={className}>
      <ExploreMap
        providers={providers}
        hoveredId={hoveredId}
        onMarkerHover={setHoveredId}
        onMarkerLeave={() => setHoveredId(null)}
        pin={pin}
        radiusKm={radiusKm}
        onPinChange={onPinChange}
      />
    </div>
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

function parseCoord(raw: string | null): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function GeocodeBridge({
  onReady,
}: {
  onReady: (fn: (q: string) => Promise<{ lat: number; lng: number; formattedAddress: string }>) => void;
}) {
  const geocoding = useMapsLibrary("geocoding");

  useEffect(() => {
    if (!geocoding) return;
    const geocoder = new geocoding.Geocoder();
    onReady(async (q: string) => {
      const response = await geocoder.geocode({
        address: q,
        componentRestrictions: { country: "MX" },
        bounds: { south: 25.4, west: -100.6, north: 25.9, east: -99.8 },
      });
      const first = response.results[0];
      if (!first?.geometry?.location) {
        throw new Error("not found");
      }
      return {
        lat: first.geometry.location.lat(),
        lng: first.geometry.location.lng(),
        formattedAddress: first.formatted_address,
      };
    });
  }, [geocoding, onReady]);

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
  const latParam = parseCoord(searchParams.get("lat"));
  const lngParam = parseCoord(searchParams.get("lng"));
  const radiusKm = clampRadiusKm(parseCoord(searchParams.get("radiusKm")) ?? DEFAULT_RADIUS_KM);
  const hasPin = latParam != null && lngParam != null;
  const pin = hasPin ? { lat: latParam, lng: lngParam } : null;

  const activeFilters: string[] = [];
  if (verified) activeFilters.push("verificado");
  if (categoryChip) activeFilters.push(categoryChip);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [providers, setProviders] = useState<ProviderListing[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [locating, setLocating] = useState(false);
  const [geoDenied, setGeoDenied] = useState(false);
  const [pinLabel, setPinLabel] = useState<string | undefined>();
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [guest, setGuest] = useState(false);
  const [geocodeFn, setGeocodeFn] = useState<
    ((q: string) => Promise<{ lat: number; lng: number; formattedAddress: string }>) | null
  >(null);

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
        lat: hasPin ? latParam : undefined,
        lng: hasPin ? lngParam : undefined,
        radiusKm: hasPin ? radiusKm : undefined,
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
  }, [q, page, verified, categoryParam, hasPin, latParam, lngParam, radiusKm]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  useEffect(() => {
    const stored = readExplorePin();
    if (!hasPin && stored) {
      pushParams((params) => {
        params.set("lat", String(stored.lat));
        params.set("lng", String(stored.lng));
        params.set("radiusKm", String(stored.radiusKm || DEFAULT_RADIUS_KM));
      });
      if (stored.formattedAddress) setPinLabel(stored.formattedAddress);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    listMyAddresses()
      .then(({ data }) => {
        setAddresses(data);
        setGuest(false);
        const def = data.find((a) => a.isDefault) ?? data[0];
        if (def) setSelectedAddressId(def.id);
      })
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          setGuest(true);
        }
      });
  }, []);

  function pushParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const qs = params.toString();
    router.push(qs ? `/explorar?${qs}` : "/explorar");
  }

  function setPin(next: { lat: number; lng: number; formattedAddress?: string; radius?: number }) {
    const nextRadius = next.radius ?? radiusKm;
    writeExplorePin({
      lat: next.lat,
      lng: next.lng,
      formattedAddress: next.formattedAddress,
      radiusKm: nextRadius,
    });
    if (next.formattedAddress) setPinLabel(next.formattedAddress);
    pushParams((params) => {
      params.set("lat", String(next.lat));
      params.set("lng", String(next.lng));
      params.set("radiusKm", String(nextRadius));
      params.delete("page");
    });
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
    const geo = hasPin
      ? `lat=${latParam}&lng=${lngParam}&radiusKm=${radiusKm}`
      : "";
    router.push(geo ? `/explorar?${geo}` : "/explorar");
  }

  function onUseMyLocation() {
    if (!navigator.geolocation) {
      setGeoDenied(true);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoDenied(false);
        setLocating(false);
        setPin({ lat: pos.coords.latitude, lng: pos.coords.longitude, formattedAddress: "Mi ubicación" });
      },
      () => {
        setLocating(false);
        setGeoDenied(true);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  async function onSearchAddress(query: string) {
    if (!geocodeFn) {
      throw new Error("geocoder unavailable");
    }
    const result = await geocodeFn(query);
    setPin(result);
  }

  async function onSaveAddress() {
    if (guest || !hasPin) {
      writeExplorePin({
        lat: latParam ?? 0,
        lng: lngParam ?? 0,
        formattedAddress: pinLabel,
        radiusKm,
      });
      window.location.href = `/login?redirect=${encodeURIComponent("/explorar")}`;
      return;
    }
    const label = window.prompt("Etiqueta (ej. Casa, Trabajo)", pinLabel?.slice(0, 40) || "Casa");
    if (!label) return;
    try {
      const { data } = await createAddress({
        label: label.slice(0, 40),
        formattedAddress: pinLabel || `${latParam}, ${lngParam}`,
        lat: latParam!,
        lng: lngParam!,
        isFavorite: true,
      });
      setAddresses((prev) => [data, ...prev]);
      setSelectedAddressId(data.id);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        window.location.href = `/login?redirect=${encodeURIComponent("/explorar")}`;
      }
    }
  }

  const hasFilters = Boolean(q || verified || categoryParam);
  const emptyRadio = !loading && !error && providers.length === 0 && hasPin;
  const summary = useMemo(() => {
    if (loading || error) return null;
    if (total === 0) return null;
    const base = `${total} frutería${total !== 1 ? "s" : ""}`;
    if (hasPin) return `${base} a ${radiusKm} km`;
    return `${base} en Monterrey`;
  }, [loading, error, total, hasPin, radiusKm]);

  const onGeocodeReady = useCallback(
    (fn: (q: string) => Promise<{ lat: number; lng: number; formattedAddress: string }>) => {
      setGeocodeFn(() => fn);
    },
    []
  );

  return (
    <>
      {getGoogleMapsApiKey() ? <GeocodeBridge onReady={onGeocodeReady} /> : null}

      <FilterBar activeFilters={activeFilters} onToggle={toggleFilter} />
      <LocationBar
        radiusKm={radiusKm}
        onRadiusChange={(km) => {
          if (hasPin) setPin({ lat: latParam!, lng: lngParam!, formattedAddress: pinLabel, radius: km });
          else {
            pushParams((params) => {
              params.set("radiusKm", String(km));
            });
          }
        }}
        hasPin={hasPin}
        pinLabel={pinLabel}
        onUseMyLocation={onUseMyLocation}
        locating={locating}
        geoDenied={geoDenied && !hasPin}
        onSearchAddress={onSearchAddress}
        addresses={addresses}
        selectedAddressId={selectedAddressId}
        onSelectAddress={(a) => {
          setSelectedAddressId(a.id);
          setPin({ lat: a.lat, lng: a.lng, formattedAddress: a.label });
        }}
        onSaveAddress={() => void onSaveAddress()}
        canSave={hasPin}
        guest={guest}
      />

      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <div className="overflow-y-auto px-6 py-6 lg:w-[55%] xl:w-[58%]">
          {!loading && !error && summary && (
            <p className="mb-5 text-sm text-gray-600">
              {summary}
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
              title={emptyRadio ? "No hay fruterías en este radio" : "No encontramos fruterías"}
              description={
                emptyRadio
                  ? "Prueba ampliar el radio o limpiar filtros."
                  : hasFilters
                    ? "Intenta ajustar los filtros o buscar con otros términos."
                    : "Activa ubicación o busca una dirección. Aún no hay fruterías publicadas en esta zona."
              }
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  {emptyRadio && radiusKm < MAX_RADIUS_KM && (
                    <Button
                      variant="secondary"
                      onClick={() =>
                        setPin({
                          lat: latParam!,
                          lng: lngParam!,
                          formattedAddress: pinLabel,
                          radius: Math.min(MAX_RADIUS_KM, radiusKm + 5),
                        })
                      }
                    >
                      Ampliar radio
                    </Button>
                  )}
                  {hasFilters ? (
                    <Button variant="secondary" onClick={clearFilters}>
                      Limpiar filtros
                    </Button>
                  ) : undefined}
                </div>
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

        <div className="sticky top-[130px] hidden h-[calc(100vh-220px)] lg:block lg:w-[45%] xl:w-[42%]">
          <ExploreMapSection
            providers={providers}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
            loading={loading}
            className="h-full"
            pin={pin}
            radiusKm={radiusKm}
            onPinChange={(lat, lng) => setPin({ lat, lng, formattedAddress: pinLabel })}
          />
        </div>
      </div>

      <div className="h-[300px] w-full px-6 pb-6 lg:hidden">
        <ExploreMapSection
          providers={providers}
          hoveredId={hoveredId}
          setHoveredId={setHoveredId}
          loading={loading}
          className="h-full overflow-hidden rounded-xl"
          pin={pin}
          radiusKm={radiusKm}
          onPinChange={(lat, lng) => setPin({ lat, lng, formattedAddress: pinLabel })}
        />
      </div>
    </>
  );
}

export function ExplorePageClient() {
  return (
    <GoogleMapsProvider>
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
    </GoogleMapsProvider>
  );
}
