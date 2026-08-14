import {
  FulfillmentType,
  OrderSource,
  OrderStatus,
  PaymentMethod,
  Prisma,
  UnitOfMeasure,
} from "@prisma/client";
import { formatMoney, formatQuantity } from "@/lib/money";

export type DeliveryAddressSnapshot = {
  label: string;
  formattedAddress: string;
  lat: number;
  lng: number;
};

export type OrderItemRecord = {
  id: string;
  providerProductId: string | null;
  productId: string | null;
  itemName: string;
  quantity: Prisma.Decimal;
  unitOfMeasure: UnitOfMeasure;
  unitPrice: Prisma.Decimal;
  subtotal: Prisma.Decimal;
};

export type OrderRecord = {
  id: string;
  source: OrderSource;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paidAt: Date | null;
  providerId: string;
  clientId: string | null;
  customerName: string | null;
  notes: string | null;
  total: Prisma.Decimal;
  createdAt: Date;
  fulfillmentType: FulfillmentType;
  etaMinutes: number | null;
  deliveryAddressSnapshot: DeliveryAddressSnapshot | Prisma.JsonValue | null;
  items: OrderItemRecord[];
  provider: { id: string; businessName: string; userId: string };
  client: { id: string; name: string; phone: string | null } | null;
};

function snapshotOf(
  value: OrderRecord["deliveryAddressSnapshot"]
): DeliveryAddressSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const snap = value as Record<string, unknown>;
  if (
    typeof snap.label !== "string" ||
    typeof snap.formattedAddress !== "string" ||
    typeof snap.lat !== "number" ||
    typeof snap.lng !== "number"
  ) {
    return null;
  }
  return {
    label: snap.label,
    formattedAddress: snap.formattedAddress,
    lat: snap.lat,
    lng: snap.lng,
  };
}

export function serializeOrderItem(item: OrderItemRecord) {
  return {
    id: item.id,
    providerProductId: item.providerProductId,
    productId: item.productId,
    itemName: item.itemName,
    quantity: formatQuantity(item.quantity),
    unitOfMeasure: item.unitOfMeasure,
    unitPrice: formatMoney(item.unitPrice),
    subtotal: formatMoney(item.subtotal),
  };
}

export function serializeOrder(
  order: OrderRecord,
  options: { includeClient?: boolean } = {}
) {
  const data: Record<string, unknown> = {
    id: order.id,
    source: order.source,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paidAt: order.paidAt?.toISOString() ?? null,
    providerId: order.providerId,
    providerName: order.provider.businessName,
    clientId: order.clientId,
    customerName: order.customerName,
    notes: order.notes,
    total: formatMoney(order.total),
    items: order.items.map(serializeOrderItem),
    createdAt: order.createdAt.toISOString(),
    fulfillmentType: order.fulfillmentType,
    etaMinutes: order.etaMinutes,
    deliveryAddressSnapshot: snapshotOf(order.deliveryAddressSnapshot),
  };

  if (options.includeClient) {
    data.client = order.client
      ? {
          id: order.client.id,
          name: order.client.name,
          phone: order.client.phone,
        }
      : null;
  }

  return data;
}

export function serializeClientOrderSummary(order: OrderRecord) {
  return {
    id: order.id,
    source: order.source,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paidAt: order.paidAt?.toISOString() ?? null,
    providerId: order.providerId,
    providerName: order.provider.businessName,
    clientId: order.clientId,
    notes: order.notes,
    total: formatMoney(order.total),
    items: order.items.map((item) => ({
      itemName: item.itemName,
      quantity: formatQuantity(item.quantity),
      unitOfMeasure: item.unitOfMeasure,
      subtotal: formatMoney(item.subtotal),
    })),
    createdAt: order.createdAt.toISOString(),
    fulfillmentType: order.fulfillmentType,
    etaMinutes: order.etaMinutes,
    deliveryAddressSnapshot: snapshotOf(order.deliveryAddressSnapshot),
  };
}

export function serializeProviderOrderRow(order: OrderRecord) {
  return {
    id: order.id,
    source: order.source,
    status: order.status,
    total: formatMoney(order.total),
    itemCount: order.items.length,
    customerName: order.customerName,
    client: order.client
      ? {
          id: order.client.id,
          name: order.client.name,
          phone: order.client.phone,
        }
      : null,
    notes: order.notes,
    createdAt: order.createdAt.toISOString(),
    fulfillmentType: order.fulfillmentType,
    etaMinutes: order.etaMinutes,
  };
}

export const orderDetailInclude = {
  items: true,
  provider: { select: { id: true, businessName: true, userId: true } },
  client: { select: { id: true, name: true, phone: true } },
} as const;
