import type { ProviderReview } from "@/lib/api/types";
import { RatingStars } from "./RatingStars";

export function ReviewCard({ review }: { review: ProviderReview }) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">{review.authorName}</p>
        <time className="text-xs text-slate-500" dateTime={review.createdAt}>
          {new Date(review.createdAt).toLocaleDateString("es-MX")}
        </time>
      </div>
      <div className="mt-1">
        <RatingStars value={review.rating} readOnly size={16} />
      </div>
      {review.comment && <p className="mt-2 text-sm text-slate-600">{review.comment}</p>}
    </article>
  );
}
