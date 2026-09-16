import { apiGet, apiPatch, apiPost, buildQuery } from "./client";
import type {
  BranchInventoryReport,
  CatalogItem,
  GlobalInventoryReport,
  PriceHistoryRow,
} from "./types";

export interface ArchiveResult {
  productId: string;
  providerProductId: string;
  archivedAt: string | null;
  createdStub?: boolean;
}

export interface OfferPatchBody {
  price?: string;
  saleUnit?: string | null;
  boxContentFactor?: string | null;
  sectionId?: string | null;
  isAvailable?: boolean;
  confirmDiscard?: boolean;
}

export async function archiveProviderProduct(productId: string) {
  return apiPost<ArchiveResult>(`/api/provider/products/by-product/${productId}/archive`, {});
}

export async function restoreProviderProduct(productId: string) {
  return apiPost<ArchiveResult>(`/api/provider/products/by-product/${productId}/restore`, {});
}

export async function patchOfferByProduct(productId: string, body: OfferPatchBody) {
  return apiPatch<CatalogItem>(`/api/provider/products/by-product/${productId}`, body);
}

export async function patchOfferPrice(productId: string, price: string) {
  return apiPatch<{
    productId: string;
    providerProductId: string;
    price: string;
    previousPrice: string | null;
  }>(`/api/provider/products/by-product/${productId}/price`, { price });
}

export async function getPriceHistory(providerProductId: string, page = 1, limit = 50) {
  const qs = buildQuery({ page, limit });
  return apiGet<PriceHistoryRow[]>(
    `/api/provider/products/${providerProductId}/price-history${qs}`
  );
}

export async function getBranchInventoryReport(query: {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
} = {}) {
  const qs = buildQuery({
    page: query.page,
    limit: query.limit ?? 50,
    from: query.from,
    to: query.to,
  });
  return apiGet<BranchInventoryReport>(`/api/provider/reports/inventory${qs}`);
}

export async function getGlobalInventoryReport() {
  return apiGet<GlobalInventoryReport>("/api/provider/reports/global/inventory");
}
