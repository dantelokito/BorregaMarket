import { apiGet, apiPatch, apiPostForm } from "./client";
import type { ProviderBusiness, ProviderProductsResponse } from "./types";

export async function getMyBusiness() {
  return apiGet<ProviderBusiness>("/api/provider/me");
}

export async function getMyProducts() {
  return apiGet<ProviderProductsResponse>("/api/provider/products");
}

export async function updateProduct(input: {
  productId: string;
  isAvailable: boolean;
  price?: number;
}) {
  return apiPatch<ProviderProductsResponse>("/api/provider/products", input);
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
