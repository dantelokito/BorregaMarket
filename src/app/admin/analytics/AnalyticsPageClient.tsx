"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAdminAnalytics, deleteAdminReview } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import type { AdminAnalytics, AnalyticsRange } from "@/lib/api/types";
import { PeriodToggle } from "@/components/admin/PeriodToggle";
import { KpiCardAdmin, formatGmv, formatRate } from "@/components/admin/KpiCardAdmin";
import { OriginSplitBar } from "@/components/admin/OriginSplitBar";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

export function AnalyticsPageClient() {
  const { showToast } = useToast();
  const [range, setRange] = useState<AnalyticsRange>("7d");
  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewId, setReviewId] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError("");
    getAdminAnalytics(range)
      .then(({ data: next }) => setData(next))
      .catch((err) => {
        setData(null);
        setError(err instanceof ApiError ? err.message : "No pudimos cargar la analítica");
      })
      .finally(() => setLoading(false));
  }, [range]);

  async function removeReview(e: React.FormEvent) {
    e.preventDefault();
    if (!reviewId.trim()) return;
    setDeleting(true);
    try {
      await deleteAdminReview(reviewId.trim());
      showToast("Reseña eliminada");
      setReviewId("");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "No se pudo eliminar", "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analítica de plataforma</h1>
          <p className="text-sm text-slate-500">GMV, cancelaciones y split Marketplace vs POS</p>
        </div>
        <Link href="/admin" className="text-sm text-[var(--brand)] hover:underline">
          ← Panel admin
        </Link>
      </div>

      <PeriodToggle value={range} onChange={setRange} />

      {error && (
        <div className="mt-6">
          <ErrorBanner message={error} />
        </div>
      )}

      {loading && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
      )}

      {!loading && !error && data?.empty && (
        <div className="mt-8">
          <EmptyState title="No hay actividad en este periodo" description="Prueba otro rango de fechas." />
        </div>
      )}

      {!loading && !error && data && !data.empty && data.kpis && (
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCardAdmin label="GMV" value={formatGmv(data.kpis.gmv)} />
            <KpiCardAdmin label="Órdenes" value={String(data.kpis.orderCount)} />
            <KpiCardAdmin label="Proveedores activos" value={String(data.kpis.activeProviders)} />
            <KpiCardAdmin label="Cancelación" value={formatRate(data.kpis.cancellationRate)} />
          </div>
          <OriginSplitBar marketplace={data.kpis.bySource.MARKETPLACE} pos={data.kpis.bySource.POS} />
        </div>
      )}

      <form onSubmit={removeReview} className="mt-10 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold">Moderar reseña</h2>
        <p className="mt-1 text-xs text-slate-500">Elimina por ID (DELETE /api/admin/reviews/:id)</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={reviewId}
            onChange={(e) => setReviewId(e.target.value)}
            placeholder="ID de reseña"
            className="h-11 min-w-[200px] flex-1 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          />
          <Button type="submit" loading={deleting} disabled={!reviewId.trim()}>
            Eliminar
          </Button>
        </div>
      </form>
    </div>
  );
}
