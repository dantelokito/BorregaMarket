import { apiGet, apiPatch, apiPost, buildQuery } from "./client";
import type { FulfillmentType, Order, OrderReview, OrderStatus } from "./types";

export interface CreateOrderInput {
  providerId: string;
  notes?: string;
  items: { providerProductId: string; quantity: string; unitOfMeasure?: string }[];
  fulfillmentType?: FulfillmentType;
  deliveryAddressId?: string;
  clientLat?: number;
  clientLng?: number;
}

export async function createOrder(input: CreateOrderInput, idempotencyKey: string) {
  return apiPost<Order>("/api/orders", input, {
    headers: { "Idempotency-Key": idempotencyKey },
  });
}

export async function listMyOrders(query: { page?: number; limit?: number; status?: OrderStatus } = {}) {
  const qs = buildQuery({
    page: query.page,
    limit: query.limit,
    status: query.status,
  });
  return apiGet<Order[]>(`/api/orders${qs}`);
}

export async function getOrderById(id: string) {
  return apiGet<Order>(`/api/orders/${id}`);
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  return apiPatch<Order>(`/api/orders/${id}`, { status });
}

export async function createOrderReview(orderId: string, input: { rating: number; comment?: string }) {
  return apiPost<OrderReview>(`/api/orders/${orderId}/reviews`, input);
}

export async function getOrderReview(orderId: string) {
  return apiGet<OrderReview>(`/api/orders/${orderId}/review`);
}
