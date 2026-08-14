import { Clock, CheckCircle2, PackageCheck, Truck, XCircle } from "lucide-react";
import type { FulfillmentType, OrderStatus } from "@/lib/api/types";
import { ORDER_STATUS_LABEL, inTransitLabel } from "@/lib/orders/labels";

const ICONS: Record<OrderStatus, typeof Clock> = {
  PENDING: Clock,
  CONFIRMED: CheckCircle2,
  IN_TRANSIT: PackageCheck,
  DELIVERED: Truck,
  CANCELLED: XCircle,
};

const STYLES: Record<OrderStatus, string> = {
  PENDING: "bg-amber-50 text-amber-800",
  CONFIRMED: "bg-blue-50 text-blue-800",
  IN_TRANSIT: "bg-emerald-50 text-emerald-800",
  DELIVERED: "bg-slate-100 text-slate-700",
  CANCELLED: "bg-red-50 text-red-700",
};

export function OrderStatusBadge({
  status,
  fulfillmentType,
}: {
  status: OrderStatus;
  fulfillmentType?: FulfillmentType;
}) {
  const Icon =
    status === "IN_TRANSIT" && fulfillmentType === "DELIVERY" ? Truck : ICONS[status];
  const label =
    status === "IN_TRANSIT"
      ? inTransitLabel(fulfillmentType ?? "PICKUP")
      : ORDER_STATUS_LABEL[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${STYLES[status]}`}
    >
      <Icon size={12} aria-hidden />
      {label}
    </span>
  );
}
