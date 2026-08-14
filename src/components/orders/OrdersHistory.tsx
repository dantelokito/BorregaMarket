"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { listMyOrders, updateOrderStatus } from "@/lib/api/orders";
import { ApiError } from "@/lib/api/client";
import type { Order } from "@/lib/api/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { OrderStatusBadge } from "@/components/ui/OrderStatusBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatQty } from "@/lib/format";
import { shortOrderId, UNIT_LABEL } from "@/lib/orders/labels";
import { ReviewForm } from "@/components/reviews/ReviewForm";

export function OrdersHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await listMyOrders({ page: 1, limit: 20 });
      setOrders(data);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("No pudimos cargar tus pedidos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function confirmCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    setActionError("");
    try {
      const { data } = await updateOrderStatus(cancelTarget.id, "CANCELLED");
      setOrders((prev) => prev.map((o) => (o.id === data.id ? data : o)));
      setCancelTarget(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setActionError("Ese cambio ya no es posible");
        void load();
      } else if (err instanceof ApiError) {
        setActionError(err.message);
      } else {
        setActionError("No pudimos cancelar el pedido");
      }
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-200" />
        ))}
      </div>
    );
  }

  if (error) {
    return <ErrorBanner message={error} onRetry={() => void load()} />;
  }

  if (orders.length === 0) {
    return (
      <EmptyState
        title="Todavía no tienes pedidos"
        description="Explora fruterías y arma tu primer encargo."
        icon="🛒"
        action={
          <Link
            href="/explorar"
            className="inline-flex min-h-11 items-center rounded-lg bg-[var(--brand)] px-4 py-3 font-semibold text-white"
          >
            Explorar
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {actionError && <ErrorBanner message={actionError} />}
      <ul className="divide-y divide-gray-100">
        {orders.map((order) => (
          <li key={order.id} className="py-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">
                  Pedido #{shortOrderId(order.id)}
                  {order.providerName ? ` · ${order.providerName}` : ""}
                </p>
                <p className="text-xs text-slate-500">
                  <time dateTime={order.createdAt}>
                    {new Date(order.createdAt).toLocaleString("es-MX")}
                  </time>
                </p>
              </div>
              <OrderStatusBadge status={order.status} fulfillmentType={order.fulfillmentType} />
            </div>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              {order.items.map((item, idx) => (
                <li key={`${order.id}-${idx}`}>
                  {formatQty(item.quantity)} {UNIT_LABEL[item.unitOfMeasure]} · {item.itemName} ·{" "}
                  <span className="tabular-nums">{formatCurrency(item.subtotal)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sm font-semibold tabular-nums">{formatCurrency(order.total)}</p>
            {order.status === "PENDING" && (
              <Button
                variant="secondary"
                className="mt-3 py-1.5 text-xs"
                onClick={() => setCancelTarget(order)}
              >
                Cancelar pedido
              </Button>
            )}
            {order.status === "DELIVERED" && order.source === "MARKETPLACE" && (
              <ReviewForm orderId={order.id} />
            )}
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="¿Cancelar este pedido?"
        description="Solo puedes cancelar mientras esté pendiente. La frutería dejará de verlo como activo."
        confirmLabel={cancelling ? "Cancelando…" : "Sí, cancelar"}
        cancelLabel="Conservar"
        destructive
        onCancel={() => setCancelTarget(null)}
        onConfirm={() => void confirmCancel()}
      />
    </div>
  );
}
