import { apiGet, apiPatch, apiPostForm, buildQuery } from "./client";
import type { AdminProvider, AuditLogEntry } from "./types";

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
