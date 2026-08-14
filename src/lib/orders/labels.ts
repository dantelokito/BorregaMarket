import type { OrderStatus, OrderSource, PaymentMethod, UnitOfMeasure } from "@/lib/api/types";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmado",
  IN_TRANSIT: "Listo para recoger",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

export const ORDER_SOURCE_LABEL: Record<OrderSource, string> = {
  MARKETPLACE: "App",
  POS: "Mostrador",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: "Efectivo",
  OTHER: "Otro",
  UNPAID: "Por pagar",
};

export const UNIT_LABEL: Record<UnitOfMeasure, string> = {
  PZA: "PZA",
  KG: "KG",
  GR: "GR",
};

export function shortOrderId(id: string): string {
  return id.slice(-4).toUpperCase();
}

export function toUnitOfMeasure(unit: string): UnitOfMeasure {
  const u = unit.toUpperCase();
  if (u === "KG") return "KG";
  if (u === "GRAMO" || u === "GR") return "GR";
  return "PZA";
}
