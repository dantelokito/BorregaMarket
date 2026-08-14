"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Phone } from "lucide-react";
import { listProviderOrders, transitionProviderOrder } from "@/lib/api/provider-ops";
import { getOrderById } from "@/lib/api/orders";
import { ApiError } from "@/lib/api/client";
import type { Order, OrderStatus, ProviderOrderListItem } from "@/lib/api/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Button } from "@/components/ui/Button";
import { OrderStatusBadge } from "@/components/ui/OrderStatusBadge";
import { OriginBadge } from "@/components/ui/OriginBadge";
import { QuickSaleBadge } from "@/components/ui/QuickSaleBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency, formatQty } from "@/lib/format";
import { ORDER_STATUS_LABEL, UNIT_LABEL, shortOrderId } from "@/lib/orders/labels";
import { telHref } from "@/lib/phone";
import Link from "next/link";

const TABS = [
  { id: "active", label: "Activas" },
  { id: "completed", label: "Completadas" },
  { id: "cancelled", label: "Canceladas" },
] as const;

const NEXT_ACTIONS: Partial<Record<OrderStatus, { status: OrderStatus; label: string }[]>> = {
  PENDING: [
    { status: "CONFIRMED", label: "Aceptar" },
    { status: "CANCELLED", label: "Cancelar" },
  ],
  CONFIRMED: [
    { status: "IN_TRANSIT", label: "Listo para recoger" },
    { status: "CANCELLED", label: "Cancelar" },
  ],
  IN_TRANSIT: [
    { status: "DELIVERED", label: "Entregado" },
    { status: "CANCELLED", label: "Cancelar" },
  ],
};

function elapsed(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.max(0, Math.floor(ms / 60000));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h} h`;
}

export function OrdenesPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") as "active" | "completed" | "cancelled") || "active";
  const { showToast } = useToast();

  const [orders, setOrders] = useState<ProviderOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<{ id: string; status: OrderStatus } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await listProviderOrders({ tab, page: 1, limit: 50 });
      setOrders(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos cargar las órdenes");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  function setTab(next: string) {
    router.replace(`/proveedor/ordenes?tab=${next}`);
  }

  async function changeStatus(id: string, status: OrderStatus) {
    if (status === "CANCELLED") {
      setCancelTarget({ id, status });
      return;
    }
    await applyStatus(id, status);
  }

  async function applyStatus(id: string, status: OrderStatus) {
    try {
      await transitionProviderOrder(id, status);
      showToast("Pedido actualizado");
      setDetail(null);
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        showToast("Ese cambio ya no es posible", "error");
        await load();
      } else {
        showToast(err instanceof ApiError ? err.message : "No pudimos actualizar", "error");
      }
    }
  }

  async function openDetail(id: string) {
    setDetailLoading(true);
    try {
      const { data } = await getOrderById(id);
      setDetail(data);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "No pudimos abrir el detalle", "error");
    } finally {
      setDetailLoading(false);
    }
  }

  const tabIndex = TABS.findIndex((t) => t.id === tab);

  function onTabKey(e: React.KeyboardEvent) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const dir = e.key === "ArrowRight" ? 1 : -1;
    const next = TABS[(tabIndex + dir + TABS.length) % TABS.length];
    setTab(next.id);
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="mb-4 text-2xl font-bold">Órdenes</h1>
      <div role="tablist" aria-label="Filtro de órdenes" className="mb-6 flex gap-1 border-b" onKeyDown={onTabKey}>
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
            className={`min-h-11 px-4 text-sm font-medium ${
              tab === t.id
                ? "border-b-2 border-[var(--brand)] text-[var(--brand)]"
                : "text-slate-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <ErrorBanner message={error} onRetry={() => void load()} />}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          title="No tienes pedidos activos"
          description="Las ventas de mostrador y los encargos de la app aparecen aquí."
          action={
            <Link
              href="/proveedor/pos"
              className="inline-flex min-h-11 items-center rounded-lg bg-[var(--brand)] px-4 py-3 font-semibold text-white"
            >
              Abrir POS
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => (
            <li key={order.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">#{shortOrderId(order.id)}</p>
                  <p className="text-sm text-slate-600">
                    {order.client?.name ?? order.customerName ?? "Cliente de mostrador"}
                  </p>
                  <p className="text-xs text-slate-400">
                    <time dateTime={order.createdAt}>{elapsed(order.createdAt)}</time>
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <OriginBadge source={order.source} />
                  <OrderStatusBadge status={order.status} />
                </div>
              </div>
              <p className="mt-2 text-sm tabular-nums">
                {order.itemCount} {order.itemCount === 1 ? "producto" : "productos"} ·{" "}
                {formatCurrency(order.total)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(NEXT_ACTIONS[order.status] ?? []).map((action) => (
                  <Button
                    key={action.status}
                    variant={action.status === "CANCELLED" ? "secondary" : "primary"}
                    className="py-1.5 text-xs"
                    onClick={() => void changeStatus(order.id, action.status)}
                  >
                    {action.label}
                  </Button>
                ))}
                <Button variant="ghost" className="py-1.5 text-xs" onClick={() => void openDetail(order.id)}>
                  Ver detalle
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {(detail || detailLoading) && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDetail(null)} aria-hidden />
          <aside
            className="relative h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-label="Detalle de pedido"
          >
            {detailLoading || !detail ? (
              <div className="h-40 animate-pulse rounded-lg bg-gray-200" />
            ) : (
              <>
                <h2 className="text-lg font-semibold">Pedido #{shortOrderId(detail.id)}</h2>
                <div className="mt-2 flex gap-2">
                  <OriginBadge source={detail.source} />
                  <OrderStatusBadge status={detail.status} />
                </div>
                <p className="mt-3 text-sm">
                  {detail.client?.name ?? detail.customerName ?? "Cliente de mostrador"}
                </p>
                {detail.client?.phone && (
                  <a
                    href={telHref(detail.client.phone)}
                    className="mt-1 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[var(--brand)]"
                  >
                    <Phone size={16} /> {detail.client.phone}
                  </a>
                )}
                {detail.notes && <p className="mt-3 text-sm text-slate-600">Notas: {detail.notes}</p>}
                <ul className="mt-4 space-y-2 text-sm">
                  {detail.items.map((item) => (
                    <li key={item.id} className="flex justify-between gap-2">
                      <span>
                        {item.itemName} {!item.providerProductId && <QuickSaleBadge />}
                        <span className="block text-xs text-slate-500 tabular-nums">
                          {formatQty(item.quantity)} {UNIT_LABEL[item.unitOfMeasure]} ×{" "}
                          {formatCurrency(item.unitPrice)}
                        </span>
                      </span>
                      <span className="tabular-nums font-medium">{formatCurrency(item.subtotal)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 font-bold tabular-nums">Total {formatCurrency(detail.total)}</p>
                <Button variant="secondary" className="mt-6 w-full" onClick={() => setDetail(null)}>
                  Cerrar
                </Button>
              </>
            )}
          </aside>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="¿Cancelar este pedido?"
        description={`Pasará a ${ORDER_STATUS_LABEL.CANCELLED}. Esta acción no se puede deshacer.`}
        confirmLabel="Sí, cancelar"
        cancelLabel="Conservar"
        destructive
        onCancel={() => setCancelTarget(null)}
        onConfirm={() => {
          if (!cancelTarget) return;
          const { id, status } = cancelTarget;
          setCancelTarget(null);
          void applyStatus(id, status);
        }}
      />
    </div>
  );
}
