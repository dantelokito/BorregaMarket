import { apiGet, apiPost, buildQuery } from "./client";
import type { CreateProviderInput, ProviderDetail, ProviderListing } from "./types";

export type ProviderCategory = "FRUTA" | "VERDURA" | "AGRICOLA";

export interface ProvidersQuery {
  city?: string;
  q?: string;
  category?: ProviderCategory;
  verified?: boolean;
  page?: number;
  limit?: number;
}

export async function getProviders(query: ProvidersQuery = {}) {
  const qs = buildQuery({
    city: query.city,
    q: query.q && query.q.trim().length >= 2 ? query.q.trim() : undefined,
    category: query.category,
    verified: query.verified ? "true" : undefined,
    page: query.page,
    limit: query.limit,
  });
  return apiGet<ProviderListing[]>(`/api/providers${qs}`);
}

export async function getProviderById(id: string) {
  return apiGet<ProviderDetail>(`/api/providers/${id}`);
}

export async function createProvider(input: CreateProviderInput) {
  return apiPost<ProviderDetail>("/api/providers", input);
}

export async function notifyProviderContact(
  providerId: string,
  body: { source?: "call_button" | "whatsapp_button" | "other"; productIds?: string[] } = {}
) {
  return apiPost<{ notified: boolean; message: string }>(
    `/api/providers/${providerId}/contact`,
    body
  );
}
