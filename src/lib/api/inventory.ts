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

export type ShrinkageReason = "CADUCIDAD" | "DANO" | "ROBO" | "MUESTRA" | "OTRO";
export type InventoryMovementKind = "ENTRADA" | "MERMA" | "AJUSTE";

export interface InventoryMovement {
  id: string;
  providerProductId: string;
  productName: string;
  kind: InventoryMovementKind;
  quantity: string;
  receiveAs: "CATALOG" | "BOX" | null;
  appliedDelta: string;
  onHandAfter: string | null;
  reason: ShrinkageReason | null;
  note: string | null;
  createdAt: string;
}

export interface ShrinkageInput {
  quantity: string;
  reason: ShrinkageReason;
  note?: string;
}

export interface ShrinkageResult {
  id: string;
  providerProductId: string;
  kind: "MERMA";
  quantity: string;
  appliedDelta: string;
  onHandAfter: string;
  reason: ShrinkageReason;
  note: string | null;
  createdAt: string;
  onHand: string;
}

export interface AdjustmentInput {
  countedOnHand: string;
  note?: string;
}

export interface AdjustmentResult {
  id: string;
  providerProductId: string;
  kind: "AJUSTE";
  quantity: string;
  appliedDelta: string;
  onHandAfter: string;
  reason: null;
  note: string | null;
  createdAt: string;
  onHand: string;
}

export async function postInventoryShrinkage(
  providerProductId: string,
  input: ShrinkageInput
) {
  return apiPost<ShrinkageResult>(
    `/api/provider/inventory/${providerProductId}/shrinkage`,
    input
  );
}

export async function postInventoryAdjustment(
  providerProductId: string,
  input: AdjustmentInput
) {
  return apiPost<AdjustmentResult>(
    `/api/provider/inventory/${providerProductId}/adjustments`,
    input
  );
}

export async function listInventoryMovements(query: {
  page?: number;
  limit?: number;
  kind?: InventoryMovementKind;
  from?: string;
  to?: string;
  providerProductId?: string;
} = {}) {
  const params = new URLSearchParams();
  params.set("page", String(query.page ?? 1));
  params.set("limit", String(query.limit ?? 50));
  if (query.kind) params.set("kind", query.kind);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.providerProductId) params.set("providerProductId", query.providerProductId);
  return apiGet<InventoryMovement[]>(`/api/provider/inventory/movements?${params.toString()}`);
}
