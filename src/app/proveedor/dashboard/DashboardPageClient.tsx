"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getProviderDashboard } from "@/lib/api/provider-ops";
import { ApiError } from "@/lib/api/client";
import type { DashboardSummary, OrderStatus } from "@/lib/api/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { QuickSaleBadge } from "@/components/ui/QuickSaleBadge";
import { formatCurrency, formatQty } from "@/lib/format";
import { ORDER_STATUS_LABEL } from "@/lib/orders/labels";

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

function BarChartIlustrativo({
  series,
}: {
  series: { date: string; salesTotal: string; orderCount: number }[];
}) {
  const max = Math.max(...series.map((s) => Number(s.salesTotal)), 1);
  const label = `Ventas de los últimos 7 días. Máximo ${formatCurrency(max)}.`;

  return (
    <figure>
      <svg
        role="img"
        aria-label={label}
        viewBox="0 0 560 180"
        className="h-48 w-full"
      >
        {series.map((s, i) => {
          const h = (Number(s.salesTotal) / max) * 140;
          const x = 24 + i * 76;
          return (
            <g key={s.date}>
              <rect
                className="dash-bar"
                x={x}
                y={150 - h}
                width={48}
                height={h}
                rx={4}
                fill="var(--brand)"
              />
              <text x={x + 24} y={170} textAnchor="middle" fontSize="12" fill="#64748B">
                {s.date.slice(5)}
              </text>
            </g>
          );
        })}
      </svg>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-[var(--brand)]">Ver datos en tabla</summary>
        <table className="mt-2 w-full text-left text-sm">
          <thead>
            <tr>
              <th className="py-1">Fecha</th>
              <th>Ventas</th>
              <th>Órdenes</th>
            </tr>
          </thead>
          <tbody>
            {series.map((s) => (
              <tr key={s.date}>
                <td>
                  <time dateTime={s.date}>{s.date}</time>
                </td>
                <td className="tabular-nums">{formatCurrency(s.salesTotal)}</td>
                <td className="tabular-nums">{s.orderCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

export function DashboardPageClient() {
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
      <div className="mx-auto max-w-5xl space-y-4 px-6 py-8">
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
    return (
      <div className="mx-auto max-w-5xl px-6 py-8">
        <ErrorBanner message={error} onRetry={() => void load()} />
      </div>
    );
  }

  if (!data || data.empty) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="mb-4 text-2xl font-bold">Ventas</h1>
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
      </div>
    );
  }

  const statuses = Object.keys(data.statusToday) as OrderStatus[];

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-bold">Ventas</h1>
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

      <section className="mt-8 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-lg font-semibold">Últimos 7 días</h2>
        <BarChartIlustrativo series={data.series7d} />
      </section>

      <section className="mt-8 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-lg font-semibold">Top 5 productos (30 días)</h2>
        <ol className="space-y-2">
          {data.topProducts.map((p, i) => (
            <li key={`${p.providerProductId ?? "qs"}-${i}`} className="flex justify-between gap-2 text-sm">
              <span>
                {i + 1}. {p.providerProductId ? p.name : <QuickSaleBadge />}
                {!p.providerProductId && <span className="ml-2">{p.name}</span>}
              </span>
              <span className="tabular-nums">
                {formatQty(p.quantitySum)} · {formatCurrency(p.salesTotal)}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-8 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-lg font-semibold">App vs Mostrador (30 días)</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <p className="text-sm">
            App:{" "}
            <span className="font-semibold tabular-nums">
              {formatCurrency(data.kpis.bySource.marketplace.salesTotal)}
            </span>{" "}
            ({data.kpis.bySource.marketplace.orderCount} órdenes)
          </p>
          <p className="text-sm">
            Mostrador:{" "}
            <span className="font-semibold tabular-nums">
              {formatCurrency(data.kpis.bySource.pos.salesTotal)}
            </span>{" "}
            ({data.kpis.bySource.pos.orderCount} órdenes)
          </p>
        </div>
      </section>
    </div>
  );
}
