import { apiGet, apiPatch, apiPost } from "./client";

export interface InventoryItem {
  providerProductId: string;
  productId: string;
  name: string;
  unit: string;
  masterUnit?: string;
  saleUnit?: string | null;
  effectiveSaleUnit?: string;
  isAvailable: boolean;
  imageUrl: string | null;
  onHand: string;
  reserved: string;
  capacityMax: string | null;
  fillPercent: number | null;
  alertThresholdPercent: number;
  alertEnabled: boolean;
  lowStockAlert: boolean;
  boxContentFactor: string | null;
}

export async function listInventory(page = 1, limit = 50) {
  return apiGet<InventoryItem[]>(`/api/provider/inventory?page=${page}&limit=${limit}`);
}

export async function getInventoryItem(providerProductId: string) {
  return apiGet<InventoryItem>(`/api/provider/inventory/${providerProductId}`);
}

export interface PatchInventoryInput {
  capacityMax?: string | null;
  alertThresholdPercent?: number;
  alertEnabled?: boolean;
  boxContentFactor?: string | null;
  confirmDiscard?: boolean;
}

export async function patchInventoryItem(providerProductId: string, input: PatchInventoryInput) {
  return apiPatch<InventoryItem>(`/api/provider/inventory/${providerProductId}`, input);
}

export async function postInventoryEntry(
  providerProductId: string,
  input: { quantity: string; receiveAs?: "CATALOG" | "BOX" }
) {
  return apiPost<InventoryItem>(
    `/api/provider/inventory/${providerProductId}/entries`,
    input
  );
}
