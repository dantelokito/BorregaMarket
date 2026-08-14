import { apiGet, apiPatch, apiPost, buildQuery } from "./client";
import type { DashboardSummary, Order, PaymentMethod, ProviderOrderListItem } from "./types";

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
