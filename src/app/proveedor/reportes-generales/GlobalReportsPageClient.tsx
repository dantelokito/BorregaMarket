"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getGlobalProviderReport } from "@/lib/api/provider-f11";
import { getGlobalInventoryReport } from "@/lib/api/provider-f13";
import { getMyProducts } from "@/lib/api/provider-panel";
import { ApiError } from "@/lib/api/client";
import type { GlobalInventoryReport, GlobalProviderReport } from "@/lib/api/types";
import { ymdInTimeZone } from "@/lib/timezone";
import { currentMonthShortcut, monthShortcutRange, validateDateRange } from "@/lib/reports/date-range";
import { formatCurrency } from "@/lib/format";
import { productsToTopPoints, seriesToTrendPoints, sourceToMixPoints } from "@/lib/reports/unified-chart";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { DocumentActions } from "@/components/provider/reports/DocumentActions";
import { ReportKpiCard } from "@/components/provider/reports/ReportKpis";
import { UnifiedProviderChart } from "@/components/provider/reports/UnifiedProviderChart";
import { MonthShortcut } from "@/components/provider/reports/MonthShortcut";
import { DateRangeFields } from "@/components/provider/reports/DateRangeFields";
import { ProductFilterChecklist } from "@/components/provider/reports/ProductFilterChecklist";
import { ProductSalesTable } from "@/components/provider/reports/ProductSalesTable";
import { BranchBreakdownTable } from "@/components/provider/reports/BranchBreakdownTable";
import { useProviderScope } from "@/hooks/useProviderScope";
import { ActiveStoreEyebrow } from "@/components/provider/ActiveStoreEyebrow";
import { GlobalOnHandBlock } from "@/components/provider/reports/GlobalOnHandBlock";

function parseYmd(raw: string | null): string | null {
  return raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

export function GlobalReportsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status: scopeStatus, showGlobalReports, providerCount } = useProviderScope();
  const today = ymdInTimeZone(new Date());
  const defaults = currentMonthShortcut();
  const from = parseYmd(searchParams.get("from")) ?? defaults.from;
  const to = parseYmd(searchParams.get("to")) ?? defaults.to;
  const productIds = searchParams.getAll("productIds").filter(Boolean);
  const rangeError = validateDateRange(from, to, today);

  const [report, setReport] = useState<GlobalProviderReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState<string | undefined>();
  const [inv, setInv] = useState<GlobalInventoryReport | null>(null);
  const [invLoading, setInvLoading] = useState(false);
  const [invError, setInvError] = useState("");
  const [filterOptions, setFilterOptions] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (scopeStatus === "loading") return;
    if (!showGlobalReports) {
      router.replace("/proveedor/dashboard?view=reportes");
    }
  }, [scopeStatus, showGlobalReports, router]);

  const pushQuery = useCallback(
    (nextFrom: string, nextTo: string, nextIds: string[] = productIds) => {
      const params = new URLSearchParams();
      params.set("from", nextFrom);
      params.set("to", nextTo);
      for (const id of nextIds) params.append("productIds", id);
      router.replace(`/proveedor/reportes-generales?${params.toString()}`, { scroll: false });
    },
    [router, productIds]
  );

  const load = useCallback(async () => {
    if (!showGlobalReports) return;
    if (rangeError) {
      setError(rangeError);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    setErrorCode(undefined);
    try {
      const data = await getGlobalProviderReport({
        from,
        to,
        productIds: productIds.length > 0 ? productIds : undefined,
      });
      setReport(data);
    } catch (err) {
      setReport(null);
      if (err instanceof ApiError) {
        setErrorCode(err.code);
        if (err.code === "GLOBAL_REPORTS_NOT_AVAILABLE" || (err.status === 403 && providerCount <= 1)) {
          setError("Esta vista no está disponible para una sola frutería");
        } else {
          setError(err.message || "No se pudieron cargar los reportes generales");
        }
      } else {
        setError("No se pudieron cargar los reportes generales");
      }
    } finally {
      setLoading(false);
    }
  }, [from, to, productIds.join("|"), rangeError, showGlobalReports, providerCount]);

  const loadInv = useCallback(async () => {
    if (!showGlobalReports) return;
    setInvLoading(true);
    setInvError("");
    try {
      const { data } = await getGlobalInventoryReport();
      setInv(data);
    } catch (err) {
      setInv(null);
      setInvError(err instanceof ApiError ? err.message : "No se pudo cargar el inventario");
    } finally {
      setInvLoading(false);
    }
  }, [showGlobalReports]);

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

  useEffect(() => {
    if (scopeStatus !== "ready" || !showGlobalReports) return;
    void load();
    void loadInv();
  }, [load, loadInv, scopeStatus, showGlobalReports]);

  if (scopeStatus === "loading" || !showGlobalReports) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="h-28 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-28 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-28 animate-pulse rounded-xl bg-slate-100" />
        </div>
      </div>
    );
  }

  const emptyCopy =
    report?.empty === true
      ? "Sin ventas consolidadas en este corte"
      : null;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <ActiveStoreEyebrow />
      <p className="mb-2 text-sm text-slate-600">
        Esta vista suma todas tus fruterías. Rotar sucursal no la cambia.
      </p>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reportes generales</h1>
          <p className="text-sm text-slate-500">
            Todas tus fruterías · America/Monterrey
          </p>
        </div>
        <DocumentActions
          onPrint={() => window.print()}
          showPdf={false}
          disabled={loading}
        />
      </div>

      <div className="no-print mb-6 grid gap-3 lg:grid-cols-3">
        <MonthShortcut
          value={from.slice(0, 7)}
          max={today.slice(0, 7)}
          onChange={(month) => {
            const next = monthShortcutRange(month, today);
            pushQuery(next.from, next.to);
          }}
        />
        <div className="lg:col-span-2">
          <DateRangeFields
            from={from}
            to={to}
            max={today}
            error={rangeError}
            onChange={(next) => pushQuery(next.from, next.to)}
          />
        </div>
      </div>

      <div className="no-print mb-6">
        <ProductFilterChecklist
          options={filterOptions}
          selected={productIds}
          onChange={(next) => pushQuery(from, to, next)}
        />
      </div>

      {error ? (
        <ErrorBanner
          message={error}
          onRetry={errorCode === "GLOBAL_REPORTS_NOT_AVAILABLE" ? undefined : () => void load()}
        />
      ) : null}

      {loading ? (
        <div className="space-y-4" aria-busy>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="h-28 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-28 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-28 animate-pulse rounded-xl bg-slate-100" />
          </div>
          <div className="h-32 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
        </div>
      ) : report ? (
        <>
          {emptyCopy ? <p className="mb-4 text-sm text-slate-600">{emptyCopy}</p> : null}
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <ReportKpiCard label="GMV" value={formatCurrency(report.kpis.gmv)} />
            <ReportKpiCard label="Órdenes" value={String(report.kpis.orderCount)} />
            <ReportKpiCard label="Ticket" value={formatCurrency(report.kpis.avgTicket)} />
          </div>
          <div className="mb-6 grid gap-4 lg:grid-cols-2">
            <div className="lg:col-span-2">
              <UnifiedProviderChart
                variant="trend"
                title={`Ventas por día (${from} – ${to})`}
                points={seriesToTrendPoints(report.series)}
              />
            </div>
            <UnifiedProviderChart
              variant="mix"
              title="Mix de canal"
              points={sourceToMixPoints(report.kpis.bySource)}
            />
            <UnifiedProviderChart
              variant="top"
              title="Top productos"
              points={productsToTopPoints(report.products)}
            />
          </div>
          <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="mb-3 text-lg font-semibold">Venta por producto</h3>
            <ProductSalesTable products={report.products} />
          </section>
          <BranchBreakdownTable
            rows={report.byProvider}
            totalGmv={report.kpis.gmv}
            totalOrders={report.kpis.orderCount}
            totalTicket={report.kpis.avgTicket}
          />
          <GlobalOnHandBlock
            report={inv}
            loading={invLoading}
            error={invError}
            onRetry={() => void loadInv()}
          />
        </>
      ) : null}
    </div>
  );
}
