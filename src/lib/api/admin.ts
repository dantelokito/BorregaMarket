import { apiDelete, apiGet, apiPatch, apiPost, apiPostForm, buildQuery } from "./client";
import type {
  AdminAnalytics,
  AdminProduct,
  AdminProvider,
  AnalyticsRange,
  AuditLogEntry,
} from "./types";

export async function getAdminProviders(
  query: { verified?: boolean; page?: number; limit?: number } = {}
) {
  const qs = buildQuery({
    verified: query.verified !== undefined ? String(query.verified) : undefined,
    page: query.page,
    limit: query.limit,
  });
  return apiGet<AdminProvider[]>(`/api/admin/providers${qs}`);
}

export async function updateProviderVerification(id: string, isVerified: boolean) {
  return apiPatch<AdminProvider>(`/api/admin/providers/${id}`, { isVerified });
}

export async function updateProviderFlags(
  id: string,
  flags: {
    isVerified?: boolean;
    isActive?: boolean;
    offersWholesale?: boolean;
    offersDelivery?: boolean;
  }
) {
  return apiPatch<AdminProvider>(`/api/admin/providers/${id}`, flags);
}

export async function getAdminProducts(
  query: {
    q?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
    scope?: "GLOBAL" | "LOCAL";
    ownerProviderId?: string;
  } = {}
) {
  const qs = buildQuery({
    q: query.q,
    isActive: query.isActive === undefined ? undefined : String(query.isActive),
    page: query.page,
    limit: query.limit,
    scope: query.scope,
    ownerProviderId: query.ownerProviderId,
  });
  return apiGet<AdminProduct[]>(`/api/admin/products${qs}`);
}

export async function createAdminProduct(input: {
  name: string;
  slug?: string;
  description?: string | null;
  category: "FRUTA" | "VERDURA" | "AGRICOLA";
  unit: "KG" | "PIEZA" | "MANOJO" | "CAJA" | "LITRO" | "GRAMO";
  isActive?: boolean;
}) {
  return apiPost<AdminProduct>("/api/admin/products", input);
}

export async function patchAdminProduct(
  id: string,
  input: {
    name?: string;
    slug?: string;
    description?: string | null;
    category?: "FRUTA" | "VERDURA" | "AGRICOLA";
    unit?: "KG" | "PIEZA" | "MANOJO" | "CAJA" | "LITRO" | "GRAMO";
    isActive?: boolean;
  }
) {
  return apiPatch<AdminProduct>(`/api/admin/products/${id}`, input);
}

export async function getAuditLog(
  query: {
    module?: string;
    action?: string;
    userId?: string;
    page?: number;
    limit?: number;
  } = {}
) {
  const qs = buildQuery(query);
  return apiGet<AuditLogEntry[]>(`/api/admin/audit${qs}`);
}

export async function getCatalog(catalog: string) {
  return apiGet<unknown[]>(`/api/catalogs?catalog=${catalog}`);
}

export async function uploadAdminProductImage(productId: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  return apiPostForm<{ url: string; field: "imageUrl" }>(
    `/api/admin/products/${productId}/image`,
    form
  );
}

export async function getAdminAnalytics(range: AnalyticsRange = "7d") {
  const qs = buildQuery({ range });
  return apiGet<AdminAnalytics>(`/api/admin/analytics${qs}`);
}

export async function deleteAdminReview(id: string) {
  return apiDelete<{ id: string; deleted: true }>(`/api/admin/reviews/${id}`);
}
