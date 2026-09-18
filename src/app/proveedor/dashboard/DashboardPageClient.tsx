"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getProviderDashboard } from "@/lib/api/provider-ops";
import { ApiError } from "@/lib/api/client";
import type { DashboardSummary, OrderStatus } from "@/lib/api/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { formatCurrency } from "@/lib/format";
import { ORDER_STATUS_LABEL } from "@/lib/orders/labels";
import { parseDashboardView } from "@/lib/reports/period";
import { currentMonthShortcut } from "@/lib/reports/date-range";
import { productsToTopPoints, seriesToTrendPoints, sourceToMixPoints } from "@/lib/reports/unified-chart";
import { DashboardViewSwitcher } from "@/components/provider/reports/DashboardViewSwitcher";
import { ReportsView } from "@/components/provider/reports/ReportsView";
import { UnifiedProviderChart } from "@/components/provider/reports/UnifiedProviderChart";
import { ActiveStoreEyebrow } from "@/components/provider/ActiveStoreEyebrow";

function KpiCard({ label, amount, count }: { label: string; amount: string; count: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-[1.875rem] font-semibold tabular-nums leading-tight">{formatCurrency(amount)}</p>
      <p className="mt-1 text-sm text-slate-500">
        {count} {count === 1 ? "orden" : "órdenes"}
      </p>
    </div>
  );
}

function DashboardSummaryView() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const { data: summary } = await getProviderDashboard("30d");
      setData(summary);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos cargar tus ventas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
        <div className="h-48 animate-pulse rounded-xl bg-gray-200" />
      </div>
    );
  }

  if (error) {
    return <ErrorBanner message={error} onRetry={() => void load()} />;
  }

  if (!data || data.empty) {
    return (
      <EmptyState
        title="Todavía no hay ventas registradas"
        description="Cobra en el POS o espera el primer encargo de la app."
        action={
          <Link
            href="/proveedor/pos"
            className="inline-flex min-h-11 items-center rounded-lg bg-[var(--brand)] px-4 py-3 font-semibold text-white"
          >
            Abrir POS
          </Link>
        }
      />
    );
  }

  const statuses = Object.keys(data.statusToday) as OrderStatus[];

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard label="Hoy" amount={data.kpis.d1.salesTotal} count={data.kpis.d1.orderCount} />
        <KpiCard label="Últimos 7 días" amount={data.kpis.d7.salesTotal} count={data.kpis.d7.orderCount} />
        <KpiCard label="Últimos 30 días" amount={data.kpis.d30.salesTotal} count={data.kpis.d30.orderCount} />
      </div>

      <section className="mt-8 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-lg font-semibold">Hoy por estado</h2>
        <ul className="flex flex-wrap gap-3 text-sm">
          {statuses.map((status) => (
            <li key={status}>
              <Link
                href={`/proveedor/ordenes?tab=${
                  status === "DELIVERED" ? "completed" : status === "CANCELLED" ? "cancelled" : "active"
                }`}
                className="rounded-full bg-slate-100 px-3 py-1 hover:bg-slate-200"
              >
                {ORDER_STATUS_LABEL[status]}: {data.statusToday[status]}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <UnifiedProviderChart
            variant="trend"
            title="Últimos 7 días"
            points={seriesToTrendPoints(data.series7d)}
          />
        </div>
        <UnifiedProviderChart
          variant="mix"
          title="Mix de canal (30 días)"
          points={sourceToMixPoints(data.kpis.bySource)}
        />
        <UnifiedProviderChart
          variant="top"
          title="Top productos (30 días)"
          points={productsToTopPoints(data.topProducts)}
        />
      </div>
    </div>
  );
}

function DashboardShell() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const view = parseDashboardView(searchParams.get("view"));

  function setView(next: "resumen" | "reportes") {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "resumen") {
      params.delete("view");
      params.delete("grain");
      params.delete("date");
      params.delete("from");
      params.delete("to");
      params.delete("productIds");
    } else {
      params.set("view", "reportes");
      params.delete("grain");
      params.delete("date");
      const range = currentMonthShortcut();
      if (!params.get("from")) params.set("from", range.from);
      if (!params.get("to")) params.set("to", range.to);
    }
    const qs = params.toString();
    router.replace(qs ? `/proveedor/dashboard?${qs}` : "/proveedor/dashboard", { scroll: false });
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <ActiveStoreEyebrow />
      <h1 className="no-print mb-4 text-2xl font-bold">Ventas</h1>
      <DashboardViewSwitcher view={view} onChange={setView} />
      {view === "reportes" ? <ReportsView /> : <DashboardSummaryView />}
    </div>
  );
}

export function DashboardPageClient() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl space-y-4 px-6 py-8">
          <div className="h-10 w-48 animate-pulse rounded bg-gray-200" />
          <div className="h-11 w-full animate-pulse rounded bg-gray-200" />
        </div>
      }
    >
      <DashboardShell />
    </Suspense>
  );
}
