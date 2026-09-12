"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Clock, X } from "lucide-react";
import { BrandLoader } from "@/components/ui/BrandLoader";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { useToast } from "@/components/ui/Toast";
import { ReviewCard } from "@/components/reviews/ReviewCard";
import { HoursTable } from "./HoursTable";
import { CapabilityIcons, WholesaleRetailChips } from "./ProviderCapabilities";
import { getProviderById } from "@/lib/api/providers";
import { ApiError } from "@/lib/api/client";
import { formatVerifiedSince } from "@/lib/providers/hours-format";
import type { ProviderDetail } from "@/lib/api/types";

interface ProviderPreviewSheetProps {
  providerId: string;
  onClose: () => void;
  /** 404: the provider is gone, so the list behind the sheet must refresh. */
  onNotFound?: () => void;
}

function OpenNowChip({ isOpenNow }: { isOpenNow: boolean | null | undefined }) {
  if (isOpenNow == null) return null;
  const styles = isOpenNow
    ? "bg-emerald-50 text-emerald-800"
    : "bg-slate-100 text-slate-700";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${styles}`}>
      <Clock size={14} aria-hidden />
      {isOpenNow ? "Abierta" : "Cerrada ahora"}
    </span>
  );
}

export function ProviderPreviewSheet({
  providerId,
  onClose,
  onNotFound,
}: ProviderPreviewSheetProps) {
  const { showToast } = useToast();
  const [provider, setProvider] = useState<ProviderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await getProviderById(providerId);
      setProvider(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        showToast("Esa frutería ya no está disponible", "error");
        onNotFound?.();
        onClose();
        return;
      }
      setError(err instanceof ApiError ? err.message : "No pudimos cargar la frutería");
    } finally {
      setLoading(false);
    }
  }, [providerId, onClose, onNotFound, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const reviews = provider?.reviewsPreview ?? [];
  const products = (provider?.products ?? []).filter((p) => p.isAvailable).slice(0, 5);

  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40"
        onClick={onClose}
        aria-label="Cerrar preview"
        tabIndex={-1}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-title"
        className="relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-h-[85vh] sm:max-w-lg sm:rounded-2xl"
      >
        <div className="flex items-center justify-end px-4 pt-3">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="inline-flex h-11 min-w-11 items-center justify-center rounded-lg px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          >
            <X size={18} aria-hidden />
            <span className="ml-1">Cerrar</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {loading && <BrandLoader size="loading" label="Cargando frutería" />}

          {error && !loading && (
            <ErrorBanner message={error} onRetry={() => void load()} />
          )}

          {provider && !loading && !error && (
            <div className="space-y-5">
              <div className="space-y-2">
                <h2 id="preview-title" className="text-xl font-semibold text-slate-900">
                  {provider.businessName}
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  {provider.hoursPublished === false ? (
                    <span className="text-sm text-slate-600">Horario no publicado</span>
                  ) : (
                    <OpenNowChip isOpenNow={provider.isOpenNow} />
                  )}
                </div>
                {provider.isVerified && (
                  <p className="text-sm text-slate-600">
                    {formatVerifiedSince(provider.verifiedAt)}
                  </p>
                )}
              </div>

              <CapabilityIcons provider={provider} />
              <WholesaleRetailChips provider={provider} />

              <section aria-labelledby="preview-hours">
                <h3 id="preview-hours" className="mb-2 text-sm font-semibold text-slate-900">
                  Horario
                </h3>
                <HoursTable hours={provider.openingHours} />
              </section>

              <section aria-labelledby="preview-catalog">
                <h3 id="preview-catalog" className="mb-2 text-sm font-semibold text-slate-900">
                  Catálogo
                </h3>
                {products.length === 0 ? (
                  <p className="text-sm text-slate-600">No hay productos activos en vitrina</p>
                ) : (
                  <ul className="space-y-1.5 text-sm text-slate-700">
                    {products.map((product) => (
                      <li key={product.providerProductId}>
                        {product.name} · {product.unit}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section aria-labelledby="preview-reviews">
                <h3 id="preview-reviews" className="mb-2 text-sm font-semibold text-slate-900">
                  Reseñas
                </h3>
                {reviews.length === 0 ? (
                  <p className="text-sm text-slate-600">Sin reseñas todavía</p>
                ) : (
                  <div className="space-y-3">
                    {reviews.slice(0, 3).map((review) => (
                      <ReviewCard key={review.id} review={review} />
                    ))}
                  </div>
                )}
                <Link
                  href={`/fruteria/${provider.id}#resenas`}
                  className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-[var(--brand)] hover:underline"
                >
                  Ver todas las reseñas
                </Link>
              </section>
            </div>
          )}
        </div>

        {provider && !loading && !error && (
          <div className="border-t border-slate-200 bg-white px-5 py-3">
            <Link
              href={`/fruteria/${provider.id}`}
              className="flex min-h-11 w-full items-center justify-center rounded-lg bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:ring-offset-2"
            >
              Ver frutería
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
