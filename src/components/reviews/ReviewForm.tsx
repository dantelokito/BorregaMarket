"use client";

import { useState } from "react";
import { createOrderReview, getOrderReview } from "@/lib/api/orders";
import { ApiError } from "@/lib/api/client";
import type { OrderReview } from "@/lib/api/types";
import { RatingStars } from "./RatingStars";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

interface ReviewFormProps {
  orderId: string;
  existing?: OrderReview | null;
  onSaved?: (review: OrderReview) => void;
}

export function ReviewForm({ orderId, existing, onSaved }: ReviewFormProps) {
  const { showToast } = useToast();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<OrderReview | null>(existing ?? null);

  const readOnly = Boolean(saved);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) {
      setError("Elige una calificación de 1 a 5");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { data } = await createOrderReview(orderId, {
        rating,
        comment: comment.trim() || undefined,
      });
      setSaved(data);
      showToast("Reseña publicada");
      onSaved?.(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        try {
          const { data } = await getOrderReview(orderId);
          setSaved(data);
          setRating(data.rating);
          setComment(data.comment ?? "");
          showToast("Este pedido ya tiene una reseña");
        } catch {
          setError(err.message);
        }
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("No pudimos publicar la reseña");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-3 rounded-lg border border-gray-100 bg-slate-50 p-3">
      <RatingStars value={rating} onChange={readOnly ? undefined : setRating} readOnly={readOnly} />
      <label htmlFor={`review-comment-${orderId}`} className="sr-only">
        Comentario
      </label>
      <textarea
        id={`review-comment-${orderId}`}
        rows={3}
        maxLength={1000}
        value={comment}
        readOnly={readOnly}
        onChange={(e) => setComment(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)] disabled:bg-gray-50"
        placeholder="¿Cómo estuvo la fruta? (opcional)"
      />
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {!readOnly && (
        <Button type="submit" loading={saving} disabled={rating < 1} className="h-11">
          Publicar reseña
        </Button>
      )}
    </form>
  );
}
