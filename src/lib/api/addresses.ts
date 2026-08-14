import { apiDelete, apiGet, apiPatch, apiPost } from "./client";
import type { UserAddress } from "./types";

export interface CreateAddressInput {
  label: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  isFavorite?: boolean;
  isDefault?: boolean;
}

export async function listMyAddresses() {
  return apiGet<UserAddress[]>("/api/users/me/addresses");
}

export async function createAddress(input: CreateAddressInput) {
  return apiPost<UserAddress>("/api/users/me/addresses", input);
}

export async function updateAddress(id: string, input: Partial<CreateAddressInput>) {
  return apiPatch<UserAddress>(`/api/users/me/addresses/${id}`, input);
}

export async function deleteAddress(id: string) {
  return apiDelete<{ id: string; deleted: true }>(`/api/users/me/addresses/${id}`);
}
