"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getGlobalProviderReport } from "@/lib/api/provider-f11";
import { ApiError } from "@/lib/api/client";
import type { GlobalProviderReport } from "@/lib/api/types";
import { ymdInTimeZone } from "@/lib/timezone";
import { currentMonthShortcut, monthShortcutRange, validateDateRange } from "@/lib/reports/date-range";
import { formatCurrency } from "@/lib/format";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { DocumentActions } from "@/components/provider/reports/DocumentActions";
import { ReportKpiCard } from "@/components/provider/reports/ReportKpis";
import { MonthShortcut } from "@/components/provider/reports/MonthShortcut";
import { DateRangeFields } from "@/components/provider/reports/DateRangeFields";
import { BranchBreakdownTable } from "@/components/provider/reports/BranchBreakdownTable";
import { useProviderScope } from "@/hooks/useProviderScope";
import { ActiveStoreEyebrow } from "@/components/provider/ActiveStoreEyebrow";

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
  const rangeError = validateDateRange(from, to, today);

  const [report, setReport] = useState<GlobalProviderReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState<string | undefined>();

  useEffect(() => {
    if (scopeStatus === "loading") return;
    if (!showGlobalReports) {
      router.replace("/proveedor/dashboard?view=reportes");
    }
  }, [scopeStatus, showGlobalReports, router]);

  const pushQuery = useCallback(
    (nextFrom: string, nextTo: string) => {
      const params = new URLSearchParams();
      params.set("from", nextFrom);
      params.set("to", nextTo);
      router.replace(`/proveedor/reportes-generales?${params.toString()}`, { scroll: false });
    },
    [router]
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
      const data = await getGlobalProviderReport({ from, to });
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
  }, [from, to, rangeError, showGlobalReports, providerCount]);

  useEffect(() => {
    if (scopeStatus !== "ready" || !showGlobalReports) return;
    void load();
  }, [load, scopeStatus, showGlobalReports]);

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
          <BranchBreakdownTable
            rows={report.byProvider}
            totalGmv={report.kpis.gmv}
            totalOrders={report.kpis.orderCount}
            totalTicket={report.kpis.avgTicket}
          />
        </>
      ) : null}
    </div>
  );
}
