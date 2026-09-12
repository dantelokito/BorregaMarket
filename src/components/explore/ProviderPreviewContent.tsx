import Link from "next/link";
import { Clock } from "lucide-react";
import { BrandLoader } from "@/components/ui/BrandLoader";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { ReviewCard } from "@/components/reviews/ReviewCard";
import { HoursTable } from "./HoursTable";
import { CapabilityIcons, WholesaleRetailChips } from "./ProviderCapabilities";
import { formatVerifiedSince } from "@/lib/providers/hours-format";
import type { ProviderDetail } from "@/lib/api/types";

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

interface ProviderPreviewContentProps {
  provider: ProviderDetail | null;
  loading: boolean;
  error: string;
  onRetry: () => void;
  titleId: string;
}

export function ProviderPreviewContent({
  provider,
  loading,
  error,
  onRetry,
  titleId,
}: ProviderPreviewContentProps) {
  const reviews = provider?.reviewsPreview ?? [];
  const products = (provider?.products ?? []).filter((p) => p.isAvailable).slice(0, 5);

  if (loading) return <BrandLoader size="loading" label="Cargando frutería" />;
  if (error) return <ErrorBanner message={error} onRetry={onRetry} />;
  if (!provider) return null;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h2 id={titleId} className="text-xl font-semibold text-slate-900">
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
          <p className="text-sm text-slate-600">{formatVerifiedSince(provider.verifiedAt)}</p>
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
  );
}
