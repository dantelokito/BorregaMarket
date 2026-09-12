"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getProviderReportRange } from "@/lib/api/provider-ops";
import { getMyProducts } from "@/lib/api/provider-panel";
import { ApiError } from "@/lib/api/client";
import type { ProviderReport } from "@/lib/api/types";
import { ymdInTimeZone } from "@/lib/timezone";
import {
  currentMonthShortcut,
  monthShortcutRange,
  validateDateRange,
} from "@/lib/reports/date-range";
import { formatGeneratedAt } from "@/lib/reports/period";
import { formatCurrency } from "@/lib/format";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { DocumentActions } from "./DocumentActions";
import { ReportBarChart, ReportKpiCard } from "./ReportKpis";
import { ReportOriginSplit } from "./ReportOriginSplit";
import { MonthShortcut } from "./MonthShortcut";
import { DateRangeFields } from "./DateRangeFields";
import { ProductFilterChecklist } from "./ProductFilterChecklist";
import { ProductSalesTable } from "./ProductSalesTable";
import { mapF10ApiError } from "@/lib/ui/f10-errors";

function parseYmd(raw: string | null): string | null {
  return raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

export function ReportsView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const today = ymdInTimeZone(new Date());
  const defaults = currentMonthShortcut();
  const from = parseYmd(searchParams.get("from")) ?? defaults.from;
  const to = parseYmd(searchParams.get("to")) ?? defaults.to;
  const productIds = searchParams.getAll("productIds").filter(Boolean);
  const monthValue = from.slice(0, 7);
  const rangeError = validateDateRange(from, to, today);

  const [report, setReport] = useState<ProviderReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [filterOptions, setFilterOptions] = useState<{ id: string; name: string }[]>([]);

  const pushQuery = useCallback(
    (nextFrom: string, nextTo: string, nextIds: string[]) => {
      const params = new URLSearchParams();
      params.set("view", "reportes");
      params.set("from", nextFrom);
      params.set("to", nextTo);
      params.delete("grain");
      params.delete("date");
      for (const id of nextIds) params.append("productIds", id);
      router.replace(`/proveedor/dashboard?${params.toString()}`, { scroll: false });
    },
    [router]
  );

  useEffect(() => {
    getMyProducts()
      .then(({ data }) => {
        const options = data.catalog
          .filter((item) => item.providerProductId)
          .map((item) => ({
            id: item.providerProductId as string,
            name: item.product.name,
          }));
        options.push({ id: "quickSale", name: "Venta rápida" });
        setFilterOptions(options);
      })
      .catch(() => {
        setFilterOptions([{ id: "quickSale", name: "Venta rápida" }]);
      });
  }, []);

  const load = useCallback(async () => {
    if (rangeError) {
      setLoading(false);
      setReport(null);
      return;
    }
    setLoading(true);
    setError("");
    setErrorStatus(null);
    try {
      const { data } = await getProviderReportRange({
        from,
        to,
        productIds: productIds.length > 0 ? productIds : undefined,
      });
      setReport(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        window.location.href = `/login?redirect=${encodeURIComponent(
          `/proveedor/dashboard?view=reportes&from=${from}&to=${to}`
        )}`;
        return;
      }
      setReport(null);
      setErrorStatus(err instanceof ApiError ? err.status : 0);
      setError(mapF10ApiError(err, "business"));
    } finally {
      setLoading(false);
    }
  }, [from, to, productIds.join("|"), rangeError]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedNames = useMemo(() => {
    if (productIds.length === 0) return "Todos";
    return productIds
      .map((id) => filterOptions.find((o) => o.id === id)?.name ?? id)
      .join(", ");
  }, [productIds, filterOptions]);

  const chartTitle = `Ventas por día (${from} – ${to})`;

  return (
    <div>
      <div className="no-print mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex w-full flex-col gap-3 sm:max-w-xl">
          <div>
            <h2 className="text-lg font-semibold">Reportes de ventas</h2>
            <p className="text-sm text-slate-600">TZ America/Monterrey</p>
          </div>
          <MonthShortcut
            value={monthValue}
            max={today.slice(0, 7)}
            onChange={(month) => {
              const range = monthShortcutRange(month, today);
              pushQuery(range.from, range.to, productIds);
            }}
          />
          <DateRangeFields
            from={from}
            to={to}
            max={today}
            error={rangeError}
            onChange={(next) => pushQuery(next.from, next.to, productIds)}
          />
          <ProductFilterChecklist
            options={filterOptions}
            selected={productIds}
            onChange={(next) => pushQuery(from, to, next)}
          />
        </div>
        <DocumentActions
          onPrint={() => window.print()}
          showPdf={false}
          disabled={!report}
        />
      </div>

      {error && (
        <div className="no-print mb-4">
          <ErrorBanner message={error} onRetry={errorStatus === 403 ? undefined : () => void load()} />
        </div>
      )}

      <div id="report-print-f10">
        {report && (
          <header className="print-only mb-4 hidden">
            <h1 className="text-2xl font-bold text-slate-900">{report.provider.businessName}</h1>
            <p className="text-sm text-slate-700">
              Reporte de ventas · {from} – {to}
            </p>
            <p className="text-sm text-slate-700">
              Zona horaria: {report.timezone} · Generado: {formatGeneratedAt(report.generatedAt)}
            </p>
            <p className="text-sm text-slate-700">Productos: {selectedNames}</p>
          </header>
        )}

        {loading && (
          <div className="no-print space-y-4" aria-busy="true">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-200" />
              ))}
            </div>
          </div>
        )}

        {report && !loading && (
          <>
            {report.empty && (
              <p className="mb-4 text-sm text-slate-600" role="status">
                Sin ventas en este corte
              </p>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <ReportKpiCard label="GMV" value={formatCurrency(report.kpis.gmv)} />
              <ReportKpiCard
                label="Ticket promedio"
                value={report.empty ? "—" : formatCurrency(report.kpis.avgTicket)}
              />
              <ReportKpiCard
                label="Órdenes"
                value={String(report.kpis.orderCount)}
                hint={report.kpis.orderCount === 1 ? "orden" : "órdenes"}
              />
              <ReportOriginSplit
                marketplace={report.kpis.bySource.MARKETPLACE}
                pos={report.kpis.bySource.POS}
              />
            </div>

            {report.series.length > 0 && (
              <section className="mt-8 rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="mb-3 text-lg font-semibold">{chartTitle}</h3>
                <div className="overflow-x-auto">
                  <ReportBarChart series={report.series} title={chartTitle} />
                </div>
              </section>
            )}

            <section className="mt-8 rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="mb-3 text-lg font-semibold">Venta por producto</h3>
              <ProductSalesTable products={report.products ?? []} />
            </section>
          </>
        )}
      </div>
    </div>
  );
}
