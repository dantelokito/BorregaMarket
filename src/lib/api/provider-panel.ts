import { apiDelete, apiGet, apiPatch, apiPost, apiPostForm } from "./client";
import type {
  LocalProductRecord,
  ProviderBusiness,
  ProviderProductsResponse,
  ProviderSection,
} from "./types";

export async function getMyBusiness() {
  return apiGet<ProviderBusiness>("/api/provider/me");
}

export interface PatchProviderSettingsInput {
  preparationTimeMinutes?: number;
  offersDelivery?: boolean;
  googlePlaceId?: string | null;
  googleMapsUrl?: string | null;
  googleReviewsEnabled?: boolean;
  primaryColor?: string | null;
  secondaryColor?: string | null;
}

export async function updateProviderSettings(input: PatchProviderSettingsInput) {
  return apiPatch<ProviderBusiness>("/api/provider/me", input);
}

export async function getMyProducts() {
  return apiGet<ProviderProductsResponse>("/api/provider/products");
}

export async function updateProduct(input: {
  productId: string;
  isAvailable: boolean;
  price?: number;
  sectionId?: string | null;
}) {
  return apiPatch<{ providerProduct: CatalogRowPatch }>(
    "/api/provider/products",
    input
  );
}

export interface CatalogRowPatch {
  id: string;
  productId: string;
  price: number;
  isAvailable: boolean;
  sectionId: string | null;
  imageUrl: string | null;
}

export async function uploadProviderMedia(field: "logo" | "cover", file: File) {
  const form = new FormData();
  form.append("file", file);
  form.append("field", field);
  return apiPostForm<{ url: string; field: "logoUrl" | "coverUrl" }>(
    "/api/provider/media",
    form
  );
}

export async function uploadProviderProductImage(providerProductId: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  return apiPostForm<{ url: string; field: "imageUrl" }>(
    `/api/provider/products/${providerProductId}/image`,
    form
  );
}

export interface CreateLocalProductInput {
  name: string;
  unit: "KG" | "PIEZA" | "MANOJO" | "CAJA" | "LITRO" | "GRAMO";
  price: number;
  sectionId: string;
  isAvailable?: boolean;
  description?: string | null;
}

export async function createLocalProduct(input: CreateLocalProductInput) {
  return apiPost<LocalProductRecord>("/api/provider/local-products", input);
}

export interface PatchLocalProductInput {
  name?: string;
  unit?: "KG" | "PIEZA" | "MANOJO" | "CAJA" | "LITRO" | "GRAMO";
  price?: number;
  sectionId?: string;
  isAvailable?: boolean;
  description?: string | null;
}

export async function patchLocalProduct(id: string, input: PatchLocalProductInput) {
  return apiPatch<LocalProductRecord>(`/api/provider/local-products/${id}`, input);
}

export async function listSections() {
  return apiGet<ProviderSection[]>("/api/provider/sections");
}

export async function createSection(name: string) {
  return apiPost<ProviderSection>("/api/provider/sections", { name });
}

export async function patchSection(id: string, input: { name?: string; sortOrder?: number }) {
  return apiPatch<ProviderSection>(`/api/provider/sections/${id}`, input);
}

export async function deleteSection(id: string) {
  return apiDelete<{ id: string; deleted: true }>(`/api/provider/sections/${id}`);
}

export async function reorderSections(ids: string[]) {
  return apiPatch<ProviderSection[]>("/api/provider/sections/reorder", { ids });
}
