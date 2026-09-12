"use client";

import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import { X } from "lucide-react";
import { FilterBar } from "@/components/explore/FilterBar";
import { ProviderCard } from "@/components/explore/ProviderCard";
import { LocationBar } from "@/components/explore/LocationBar";
import { RadiusSlider } from "@/components/explore/RadiusSlider";
import { ExploreCount } from "@/components/explore/ExploreCount";
import { OutOfMexicoBanner } from "@/components/explore/OutOfMexicoBanner";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Button } from "@/components/ui/Button";
import { BrandLoader } from "@/components/ui/BrandLoader";
import { getProviders, clampRadiusKm, type ProviderCategory } from "@/lib/api/providers";
import {
  createAddress,
  deleteAddress,
  listMyAddresses,
  markAddressUsed,
} from "@/lib/api/addresses";
import { geocodeAddress } from "@/lib/maps/nominatim";
import { ApiError } from "@/lib/api/client";
import type { ProviderListing, UserAddress } from "@/lib/api/types";
import { CHIP_TO_CATEGORY } from "@/types";
import { isInMexico } from "@/lib/geo/bounds";
import {
  DEFAULT_RADIUS_KM,
  MAX_RADIUS_KM,
  RADIUS_STEP_KM,
  readExplorePin,
  writeExplorePin,
} from "@/lib/maps/constants";
import { resolveExploreCenter } from "@/lib/maps/explore-center";
import { useFilterBarCollapse } from "@/hooks/useFilterBarCollapse";

const EXPLORE_PAGE_SIZE = 20;

const ExploreMap = dynamic(
  () => import("@/components/explore/ExploreMap").then((m) => m.ExploreMap),
  { ssr: false }
);

function ExploreMapSection({
  providers,
  hoveredId,
  setHoveredId,
  onMarkerSelect,
  className = "",
  pin,
  radiusKm,
  onPinChange,
  onOutOfMexico,
  tilesDown,
  onTilesError,
  onRadiusChange,
  fitToken,
}: {
  providers: ProviderListing[];
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
  onMarkerSelect: (id: string) => void;
  className?: string;
  pin: { lat: number; lng: number } | null;
  radiusKm: number;
  onPinChange: (lat: number, lng: number) => void;
  onOutOfMexico: () => void;
  tilesDown: boolean;
  onTilesError: (down: boolean) => void;
  onRadiusChange: (km: number) => void;
  fitToken: number;
}) {
  return (
    <div className={`relative ${className}`}>
      <ExploreMap
        providers={providers}
        hoveredId={hoveredId}
        onMarkerHover={setHoveredId}
        onMarkerLeave={() => setHoveredId(null)}
        onMarkerSelect={onMarkerSelect}
        pin={pin}
        radiusKm={radiusKm}
        onPinChange={onPinChange}
        onOutOfMexico={onOutOfMexico}
        onTilesError={onTilesError}
        fitToken={fitToken}
      />
      {tilesDown && (
        <p
          className="absolute left-2 right-2 top-2 z-[1000] rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-sm text-slate-700 shadow"
          role="status"
        >
          El mapa no cargó; usa la lista
        </p>
      )}
      <div className="absolute inset-x-0 bottom-0 z-[400] bg-white/95 px-3 py-1.5">
        <RadiusSlider value={radiusKm} onChange={onRadiusChange} />
      </div>
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

function ExploreContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const qRaw = searchParams.get("q") ?? "";
  const q = qRaw.trim().length >= 2 ? qRaw.trim() : "";
  const qTooShort = qRaw.trim().length === 1;
  const page = Number(searchParams.get("page") ?? "1") || 1;
  const verified = searchParams.get("verified") === "true";
  const offersWholesale = searchParams.get("offersWholesale") === "true";
  const offersDelivery = searchParams.get("offersDelivery") === "true";
  const categoryParam = categoryFromParams(searchParams);
  const categoryChip = chipIdFromCategory(categoryParam);
  const latParam = parseCoord(searchParams.get("lat"));
  const lngParam = parseCoord(searchParams.get("lng"));
  const radiusKm = clampRadiusKm(parseCoord(searchParams.get("radiusKm")) ?? DEFAULT_RADIUS_KM);
  const hasPin = latParam != null && lngParam != null && isInMexico(latParam, lngParam);
  const pin = hasPin ? { lat: latParam, lng: lngParam } : null;

  const activeFilters: string[] = [];
  if (verified) activeFilters.push("verificado");
  if (offersWholesale) activeFilters.push("mayoreo");
  if (offersDelivery) activeFilters.push("domicilio");
  if (categoryChip) activeFilters.push(categoryChip);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [providers, setProviders] = useState<ProviderListing[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [appliedRadiusKm, setAppliedRadiusKm] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [locating, setLocating] = useState(false);
  const [geoDenied, setGeoDenied] = useState(false);
  const [outOfMexico, setOutOfMexico] = useState(false);
  const [pinLabel, setPinLabel] = useState<string | undefined>();
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [guest, setGuest] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [awaitingCenter, setAwaitingCenter] = useState(false);
  const [tilesDown, setTilesDown] = useState(false);
  const [fitToken, setFitToken] = useState(0);

  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const filterBarLayoutRef = useRef<HTMLDivElement>(null);
  const {
    shellCollapsed: filterBarShellCollapsed,
    pillVisible: filterBarPillVisible,
    layoutClassName: filterBarLayoutClassName,
    layoutCollapsed: filterBarLayoutCollapsed,
    phase: filterBarPhase,
    expand: expandFilterBar,
    onLayoutTransitionEnd,
  } = useFilterBarCollapse(mainScrollRef, filterBarLayoutRef);

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data, meta } = await getProviders({
        q: q || undefined,
        page,
        limit: EXPLORE_PAGE_SIZE,
        verified: verified || undefined,
        category: (categoryParam as ProviderCategory) || undefined,
        offersWholesale: offersWholesale || undefined,
        offersDelivery: offersDelivery || undefined,
        lat: hasPin ? latParam : undefined,
        lng: hasPin ? lngParam : undefined,
        radiusKm: hasPin ? radiusKm : undefined,
      });
      setProviders(data);
      setTotalPages(meta?.totalPages ?? 1);
      setTotal(meta?.total ?? data.length);
      setAppliedRadiusKm(hasPin ? (meta?.radiusKm ?? radiusKm) : null);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Error al cargar fruterías");
      }
    } finally {
      setLoading(false);
    }
  }, [
    q,
    page,
    verified,
    categoryParam,
    offersWholesale,
    offersDelivery,
    hasPin,
    latParam,
    lngParam,
    radiusKm,
  ]);

  useEffect(() => {
    if (!hydrated) return;
    if (awaitingCenter && !hasPin) return;
    if (awaitingCenter) setAwaitingCenter(false);
    void fetchProviders();
  }, [fetchProviders, hydrated, awaitingCenter, hasPin]);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      let list: UserAddress[] = [];
      let isGuest = false;
      try {
        const { data } = await listMyAddresses();
        list = data;
      } catch (err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          isGuest = true;
        }
      }
      if (cancelled) return;

      setAddresses(list);
      setGuest(isGuest);

      const params = searchParamsRef.current;
      const urlLat = parseCoord(params.get("lat"));
      const urlLng = parseCoord(params.get("lng"));
      const urlInMexico = urlLat != null && urlLng != null && isInMexico(urlLat, urlLng);
      if (urlLat != null && urlLng != null && !urlInMexico) {
        setOutOfMexico(true);
      }

      const stored = readExplorePin();
      const storedOk = stored && isInMexico(stored.lat, stored.lng) ? stored : null;

      const center = resolveExploreCenter({
        urlPin: urlInMexico
          ? {
              lat: urlLat!,
              lng: urlLng!,
              radiusKm: clampRadiusKm(parseCoord(params.get("radiusKm")) ?? DEFAULT_RADIUS_KM),
            }
          : null,
        addresses: list,
        storedPin: storedOk,
        guest: isGuest,
      });

      if (center.label) setPinLabel(center.label);
      if (center.addressId) setSelectedAddressId(center.addressId);
      else if (list.length > 0) setSelectedAddressId(list[0].id);

      if (center.source !== "url") {
        const next = new URLSearchParams(params.toString());
        next.set("lat", String(center.lat));
        next.set("lng", String(center.lng));
        next.set("radiusKm", String(center.radiusKm));
        setAwaitingCenter(true);
        router.replace(`/explorar?${next.toString()}`);
      }

      setHydrated(true);
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pushParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const qs = params.toString();
    router.push(qs ? `/explorar?${qs}` : "/explorar");
  }

  function setPin(next: { lat: number; lng: number; formattedAddress?: string; radius?: number }) {
    if (!isInMexico(next.lat, next.lng)) {
      setOutOfMexico(true);
      return;
    }
    setOutOfMexico(false);
    const nextRadius = clampRadiusKm(next.radius ?? radiusKm);
    writeExplorePin({
      lat: next.lat,
      lng: next.lng,
      formattedAddress: next.formattedAddress,
      radiusKm: nextRadius,
    });
    if (next.formattedAddress) setPinLabel(next.formattedAddress);
    setFitToken((n) => n + 1);
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

    if (id === "mayoreo") {
      pushParams((params) => {
        if (offersWholesale) params.delete("offersWholesale");
        else params.set("offersWholesale", "true");
        params.delete("page");
      });
      return;
    }

    if (id === "domicilio") {
      pushParams((params) => {
        if (offersDelivery) params.delete("offersDelivery");
        else params.set("offersDelivery", "true");
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
    pushParams((params) => {
      params.delete("q");
      params.delete("verified");
      params.delete("category");
      params.delete("offersWholesale");
      params.delete("offersDelivery");
      params.delete("page");
    });
  }

  function clearSearch() {
    pushParams((params) => {
      params.delete("q");
      params.delete("page");
    });
  }

  function onUseMyLocation() {
    if (!navigator.geolocation) {
      setGeoDenied(true);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        if (!isInMexico(pos.coords.latitude, pos.coords.longitude)) {
          setGeoDenied(false);
          setOutOfMexico(true);
          return;
        }
        setGeoDenied(false);
        setPin({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          formattedAddress: "Mi ubicación",
        });
      },
      () => {
        setLocating(false);
        setGeoDenied(true);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  async function onSearchAddress(query: string) {
    try {
      const result = await geocodeAddress(query);
      setPin(result);
    } catch (err) {
      if (err instanceof Error && err.message === "out-of-mexico") {
        setOutOfMexico(true);
      }
      throw err;
    }
  }

  async function onSelectFavorite(address: UserAddress) {
    setSelectedAddressId(address.id);
    setPin({ lat: address.lat, lng: address.lng, formattedAddress: address.label });
    try {
      const { data } = await markAddressUsed(address.id);
      setAddresses((prev) => [data, ...prev.filter((a) => a.id !== data.id)]);
    } catch {
      // last-used is best-effort
    }
  }

  function redirectToLogin() {
    writeExplorePin({
      lat: latParam ?? 0,
      lng: lngParam ?? 0,
      formattedAddress: pinLabel,
      radiusKm,
    });
    window.location.href = `/login?redirect=${encodeURIComponent("/explorar")}`;
  }

  async function onSaveAddress(label: string) {
    if (guest || !hasPin) {
      redirectToLogin();
      return;
    }
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
      setPinLabel(data.label);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        redirectToLogin();
        return;
      }
      throw err;
    }
  }

  async function onDeleteAddress(address: UserAddress) {
    try {
      await deleteAddress(address.id);
      setAddresses((prev) => prev.filter((a) => a.id !== address.id));
      if (selectedAddressId === address.id) {
        setSelectedAddressId(null);
        setPinLabel(address.formattedAddress);
      }
    } catch {
      // keep the list if delete fails
    }
  }

  function applyRadius(km: number) {
    const next = clampRadiusKm(km);
    if (hasPin) {
      setPin({ lat: latParam!, lng: lngParam!, formattedAddress: pinLabel, radius: next });
      return;
    }
    setFitToken((n) => n + 1);
    pushParams((params) => {
      params.set("radiusKm", String(next));
    });
  }

  const selected = addresses.find((a) => a.id === selectedAddressId);
  const chipLabel = selected?.label || pinLabel || "San Nicolás";

  const hasFilters = Boolean(q || verified || categoryParam || offersWholesale || offersDelivery);
  const isEmpty = !loading && !error && total === 0;
  const emptyRadio = isEmpty && hasPin && !q && !verified && !categoryParam && !offersWholesale && !offersDelivery;
  const emptyChips = isEmpty && hasFilters && !emptyRadio;

  const mapProps = {
    providers,
    hoveredId,
    setHoveredId,
    onMarkerSelect: setPreviewId,
    pin,
    radiusKm,
    onPinChange: (lat: number, lng: number) => setPin({ lat, lng, formattedAddress: pinLabel }),
    onOutOfMexico: () => setOutOfMexico(true),
    tilesDown,
    onTilesError: setTilesDown,
    fitToken,
    onRadiusChange: applyRadius,
  };

  const locationBarProps = {
    chipLabel,
    onSearchAddress,
    addresses,
    selectedAddressId,
    onSelectAddress: (a: UserAddress) => void onSelectFavorite(a),
    onSaveAddress,
    onRequestLogin: redirectToLogin,
    onDeleteAddress,
    canSave: hasPin,
    guest,
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={filterBarLayoutRef}
        className={`explore-filterbar-layout shrink-0 ${filterBarLayoutClassName} ${
          filterBarLayoutCollapsed ? "relative z-40" : ""
        }`}
        onTransitionEnd={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.propertyName !== "grid-template-rows") return;
          onLayoutTransitionEnd();
        }}
      >
        <div className="explore-filterbar-layout-inner">
          {/* ExploreChromeF9: una barra md+; wrap en móvil */}
          <div className="border-b border-gray-100 bg-white">
            <div className="mx-auto flex max-w-[1760px] flex-col gap-2 px-4 py-2 sm:px-6 md:min-h-[48px] md:flex-row md:items-center md:gap-3 md:py-1.5">
              <div className="hidden min-w-0 flex-1 md:block">
                <FilterBar
                  activeFilters={activeFilters}
                  onToggle={toggleFilter}
                  onUseMyLocation={onUseMyLocation}
                  locating={locating}
                  compact
                />
              </div>
              <div className="md:hidden">
                <FilterBar
                  activeFilters={activeFilters}
                  onToggle={toggleFilter}
                  onUseMyLocation={onUseMyLocation}
                  locating={locating}
                  phase={filterBarPhase}
                  shellCollapsed={filterBarShellCollapsed}
                  pillVisible={filterBarPillVisible}
                  onExpand={expandFilterBar}
                />
              </div>
              <LocationBar {...locationBarProps} inline />
              {!loading && !error && total > 0 && (
                <div className="shrink-0 md:max-w-xs">
                  <ExploreCount
                    total={total}
                    radiusKm={hasPin ? (appliedRadiusKm ?? radiusKm) : null}
                    suffix={q ? ` para "${q}"` : undefined}
                  />
                </div>
              )}
            </div>

            {/* Errores / hints debajo de la barra (no inflan la fila) */}
            <div className="mx-auto max-w-[1760px] space-y-2 px-4 pb-2 sm:px-6">
              {geoDenied && (
                <p className="text-sm text-slate-600">
                  No pudimos usar tu ubicación. Puedes buscar una dirección o usar una favorita.
                  Seguimos en San Nicolás.
                </p>
              )}
              <OutOfMexicoBanner visible={outOfMexico} />
              {qTooShort && (
                <p className="text-sm text-slate-600" role="status">
                  Escribe al menos 2 caracteres
                </p>
              )}
              {q && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700">
                    Filtro: {q}
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                      aria-label="Quitar filtro de búsqueda"
                    >
                      <X size={14} aria-hidden />
                    </button>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div
        ref={mainScrollRef}
        className="explore-main-scroll flex min-h-0 flex-1 flex-col overflow-y-auto"
      >
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <div className="explore-map-section pt-4">
            <ExploreMapSection
              {...mapProps}
              className="h-[var(--explore-map-min-h-mobile)] overflow-hidden rounded-xl md:h-[min(520px,52vh)]"
            />
          </div>

          <div
            className="explore-results-panel py-4 sm:py-6"
            role="region"
            aria-label="Lista de fruterías"
            aria-busy={loading}
          >
            {error && (
              <div className="mb-6">
                <ErrorBanner message={error} onRetry={() => void fetchProviders()} />
              </div>
            )}

            {loading ? (
              <BrandLoader size="loading" label="Buscando fruterías" />
            ) : isEmpty ? (
              <EmptyState
                icon={<BrandLoader size="empty" label="" />}
                title={
                  emptyRadio
                    ? "No hay fruterías en este radio"
                    : emptyChips
                      ? "No hay fruterías con estos filtros"
                      : q
                        ? "No encontramos fruterías para tu búsqueda"
                        : "No encontramos fruterías"
                }
                description={
                  emptyRadio
                    ? "Prueba ampliar el radio o limpiar filtros."
                    : hasFilters
                      ? "Intenta ajustar los filtros o buscar con otros términos."
                      : "Activa ubicación o busca una dirección. Aún no hay fruterías publicadas en esta zona."
                }
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    {hasPin && radiusKm < MAX_RADIUS_KM && (
                      <Button
                        variant="secondary"
                        onClick={() =>
                          applyRadius(Math.min(MAX_RADIUS_KM, radiusKm + RADIUS_STEP_KM))
                        }
                      >
                        Ampliar radio
                      </Button>
                    )}
                    {q && (
                      <Button variant="secondary" onClick={clearSearch}>
                        Limpiar búsqueda
                      </Button>
                    )}
                    {hasFilters && (
                      <Button variant="secondary" onClick={clearFilters}>
                        Limpiar filtros
                      </Button>
                    )}
                  </div>
                }
              />
            ) : (
              !error && (
                <div
                  className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3"
                  role="list"
                >
                  {providers.map((provider) => (
                    <ProviderCard
                      key={provider.id}
                      provider={provider}
                      isHovered={hoveredId === provider.id}
                      onHover={() => setHoveredId(provider.id)}
                      onLeave={() => setHoveredId(null)}
                      previewOpen={previewId === provider.id}
                      onPreviewOpen={() => setPreviewId(provider.id)}
                      onPreviewClose={() =>
                        setPreviewId((current) => (current === provider.id ? null : current))
                      }
                      onPreviewNotFound={() => void fetchProviders()}
                      hasPin={hasPin}
                      radiusKm={hasPin ? (appliedRadiusKm ?? radiusKm) : null}
                    />
                  ))}
                </div>
              )
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
        </div>
      </div>
    </div>
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
