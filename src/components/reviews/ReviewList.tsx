"use client";

import { useCallback, useEffect, useState } from "react";
import { listProviderReviews } from "@/lib/api/providers";
import { ApiError } from "@/lib/api/client";
import type { ProviderReview } from "@/lib/api/types";
import { ReviewCard } from "./ReviewCard";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { EMPTY_REVIEWS_COPY, GOOGLE_REVIEWS_CTA } from "@/lib/ui/reviews-copy";

interface ReviewListProps {
  providerId: string;
  googleMapsUrl?: string | null;
  googleEnabled?: boolean;
}

export function ReviewList({ providerId, googleMapsUrl, googleEnabled }: ReviewListProps) {
  const [reviews, setReviews] = useState<ProviderReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data, meta } = await listProviderReviews(providerId, { page: 1, limit: 10 });
      setReviews(data);
      setTotal(meta?.reviewCount ?? meta?.total ?? data.length);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos cargar las reseñas");
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="mt-10" aria-labelledby="reviews-heading">
      <h2 id="reviews-heading" className="mb-4 text-lg font-semibold">
        Reseñas
      </h2>
      {googleEnabled && googleMapsUrl && (
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-4 inline-flex min-h-11 items-center text-sm font-medium text-[var(--brand)] hover:underline"
        >
          {GOOGLE_REVIEWS_CTA}
        </a>
      )}
      {loading && (
        <div className="space-y-3" aria-busy="true">
          {[0, 1].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
      )}
      {error && <ErrorBanner message={error} onRetry={() => void load()} />}
      {!loading && !error && reviews.length === 0 && (
        <p className="text-sm text-slate-500">{EMPTY_REVIEWS_COPY}</p>
      )}
      {!loading && !error && reviews.length > 0 && (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id}>
              <ReviewCard review={r} />
            </li>
          ))}
        </ul>
      )}
      {!loading && total > reviews.length && (
        <p className="mt-2 text-xs text-slate-400">{total} reseñas en total</p>
      )}
    </section>
  );
}
