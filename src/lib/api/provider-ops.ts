import { ApiError, apiGet, apiPatch, apiPost, buildQuery } from "./client";
import type { DashboardSummary, Order, PaymentMethod, ProviderOrderListItem, ProviderReport, ReportGrain } from "./types";

export type ProviderOrdersTab = "active" | "completed" | "cancelled";

export interface PosSaleItemCatalog {
  providerProductId: string;
  quantity: string;
  unitOfMeasure?: string;
}

export interface PosSaleItemCustom {
  customItem: { name: string; unitPrice: string };
  quantity: string;
  unitOfMeasure?: string;
}

export type PosSaleItem = PosSaleItemCatalog | PosSaleItemCustom;

export interface CreatePosSaleInput {
  paymentMethod: PaymentMethod;
  status?: "DELIVERED" | "CONFIRMED";
  customerName?: string | null;
  items: PosSaleItem[];
}

export async function createPosSale(input: CreatePosSaleInput, idempotencyKey: string) {
  return apiPost<Order>("/api/provider/pos/sales", input, {
    headers: { "Idempotency-Key": idempotencyKey },
  });
}

export async function listProviderOrders(query: {
  tab?: ProviderOrdersTab;
  page?: number;
  limit?: number;
  source?: "MARKETPLACE" | "POS";
} = {}) {
  const qs = buildQuery({
    tab: query.tab,
    page: query.page,
    limit: query.limit,
    source: query.source,
  });
  return apiGet<ProviderOrderListItem[]>(`/api/provider/orders${qs}`);
}

export async function transitionProviderOrder(id: string, status: string) {
  return apiPatch<Order>(`/api/provider/orders/${id}`, { status });
}

export async function getProviderDashboard(range: "1d" | "7d" | "30d" = "30d") {
  const qs = buildQuery({ range });
  return apiGet<DashboardSummary>(`/api/provider/dashboard${qs}`);
}

export async function getProviderReport(grain: ReportGrain, date: string) {
  const qs = buildQuery({ grain, date });
  return apiGet<ProviderReport>(`/api/provider/reports${qs}`);
}

export function buildReportRangeQuery(
  from: string,
  to: string,
  productIds?: string[]
): string {
  const search = new URLSearchParams();
  search.set("from", from);
  search.set("to", to);
  for (const id of productIds ?? []) {
    if (id) search.append("productIds", id);
  }
  return `?${search.toString()}`;
}

export async function getProviderReportRange(input: {
  from: string;
  to: string;
  productIds?: string[];
}) {
  const ids = input.productIds && input.productIds.length > 0 ? input.productIds : undefined;
  return apiGet<ProviderReport>(
    `/api/provider/reports${buildReportRangeQuery(input.from, input.to, ids)}`
  );
}

export function providerReportPdfUrl(grain: ReportGrain, date: string) {
  return `/api/provider/reports.pdf${buildQuery({ grain, date })}`;
}

export function providerReportPdfRangeUrl(from: string, to: string) {
  return `/api/provider/reports.pdf${buildQuery({ from, to })}`;
}

function filenameFromDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback;
  const utf = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf?.[1]) return decodeURIComponent(utf[1]);
  const quoted = header.match(/filename="([^"]+)"/i);
  if (quoted?.[1]) return quoted[1];
  const plain = header.match(/filename=([^;]+)/i);
  return plain?.[1]?.trim() || fallback;
}

async function downloadPdfFromUrl(url: string, fallback: string): Promise<void> {
  const res = await fetch(url, { credentials: "include" });
  const contentType = res.headers.get("content-type") ?? "";

  if (!res.ok || !contentType.includes("application/pdf")) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: string | { message?: string };
      details?: { field: string; message: string }[];
    };
    const message =
      typeof body.error === "string"
        ? body.error
        : body.error?.message ?? "No pudimos descargar el PDF";
    throw new ApiError(message, res.status, body.details);
  }

  const blob = await res.blob();
  const filename = filenameFromDisposition(res.headers.get("content-disposition"), fallback);
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(href);
}

/** Blob download. Do not use apiGet — PDF is not a JSON envelope. */
export async function downloadProviderReportPdf(grain: ReportGrain, date: string): Promise<void> {
  await downloadPdfFromUrl(providerReportPdfUrl(grain, date), `reporte-${grain}-${date}.pdf`);
}

export async function downloadProviderReportPdfRange(from: string, to: string): Promise<void> {
  await downloadPdfFromUrl(providerReportPdfRangeUrl(from, to), `reporte-${from}_${to}.pdf`);
}
