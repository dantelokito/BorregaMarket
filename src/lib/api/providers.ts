import { clampGeoRadiusKm, DEFAULT_RADIUS_KM } from "@/lib/validators/geo";
import { apiGet, apiPost, buildQuery } from "./client";
import type {
  CreateProviderInput,
  FulfillmentType,
  ProviderDetail,
  ProviderEta,
  ProviderListing,
  ProviderReview,
} from "./types";

export type ProviderCategory = "FRUTA" | "VERDURA" | "AGRICOLA";

export interface ProvidersQuery {
  city?: string;
  q?: string;
  category?: ProviderCategory;
  verified?: boolean;
  offersWholesale?: boolean;
  offersDelivery?: boolean;
  page?: number;
  limit?: number;
  lat?: number;
  lng?: number;
  radiusKm?: number;
}

/** CO-F8-001: clamp 0.5–10 sin Math.round (0.7 se queda 0.7; 22→10; 0→0.5). */
export function clampRadiusKm(value: number | undefined, fallback = DEFAULT_RADIUS_KM): number {
  if (value == null || Number.isNaN(value)) return fallback;
  return clampGeoRadiusKm(value);
}

/** Query string for GET /api/providers (API-GEO-01). Geo only if both lat and lng. */
export function buildProvidersQuery(query: ProvidersQuery = {}): string {
  const hasGeo = query.lat != null && query.lng != null;
  return buildQuery({
    city: query.city,
    q: query.q && query.q.trim().length >= 2 ? query.q.trim() : undefined,
    category: query.category,
    verified: query.verified ? "true" : undefined,
    offersWholesale: query.offersWholesale === true ? "true" : undefined,
    offersDelivery: query.offersDelivery === true ? "true" : undefined,
    page: query.page,
    limit: query.limit,
    lat: hasGeo ? query.lat : undefined,
    lng: hasGeo ? query.lng : undefined,
    radiusKm: hasGeo ? clampRadiusKm(query.radiusKm) : undefined,
  });
}

export async function getProviders(query: ProvidersQuery = {}) {
  return apiGet<ProviderListing[]>(`/api/providers${buildProvidersQuery(query)}`);
}

export async function getProviderById(id: string) {
  return apiGet<ProviderDetail>(`/api/providers/${id}`);
}

export async function getProviderEta(
  id: string,
  query: { lat?: number; lng?: number; fulfillmentType?: FulfillmentType } = {}
) {
  const qs = buildQuery({
    lat: query.lat,
    lng: query.lng,
    fulfillmentType: query.fulfillmentType,
  });
  return apiGet<ProviderEta>(`/api/providers/${id}/eta${qs}`);
}

export async function listProviderReviews(
  id: string,
  query: { page?: number; limit?: number } = {}
) {
  const qs = buildQuery({ page: query.page, limit: query.limit });
  return apiGet<ProviderReview[]>(`/api/providers/${id}/reviews${qs}`);
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
