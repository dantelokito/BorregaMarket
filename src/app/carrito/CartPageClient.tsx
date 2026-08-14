"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import {
  cartItemCount,
  cartTotal,
  clearCart,
  setItemQuantity,
  type CartItem,
} from "@/lib/cart/session-cart";
import { getProviderById, getProviderEta } from "@/lib/api/providers";
import { createOrder } from "@/lib/api/orders";
import { getMyProfile } from "@/lib/api/users";
import { listMyAddresses } from "@/lib/api/addresses";
import { ApiError } from "@/lib/api/client";
import type { FulfillmentType, Order, ProviderDetail, ProviderEta, UserAddress } from "@/lib/api/types";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";
import { PickupNotice } from "@/components/cart/PickupNotice";
import { OrderSuccessPanel } from "@/components/cart/OrderSuccessPanel";
import { EtaChip } from "@/components/cart/EtaChip";
import { FulfillmentToggle } from "@/components/cart/FulfillmentToggle";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency, lineAmount, qtyToApiString } from "@/lib/format";
import { UNIT_LABEL } from "@/lib/orders/labels";
import { readExplorePin } from "@/lib/maps/constants";

export function CartPageClient() {
  const { cart, hydrated, save } = useCart();
  const { showToast } = useToast();
  const [unavailable, setUnavailable] = useState<Set<string>>(new Set());
  const [checking, setChecking] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [isGuest, setIsGuest] = useState(false);
  const [successOrder, setSuccessOrder] = useState<Order | null>(null);
  const [provider, setProvider] = useState<ProviderDetail | null>(null);
  const [eta, setEta] = useState<ProviderEta | null>(null);
  const [fulfillment, setFulfillment] = useState<FulfillmentType>("PICKUP");
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [deliveryAddressId, setDeliveryAddressId] = useState<string>("");
  const idempotencyRef = useRef(crypto.randomUUID());

  const itemCount = cartItemCount(cart);
  const total = cartTotal(cart);
  const hasUnavailable = useMemo(
    () => cart?.items.some((i) => unavailable.has(i.providerProductId)) ?? false,
    [cart, unavailable]
  );

  const revalidate = useCallback(async () => {
    if (!cart) return;
    setChecking(true);
    try {
      const { data } = await getProviderById(cart.providerId);
      setProvider(data);
      const available = new Set(
        data.products.filter((p) => p.isAvailable).map((p) => p.providerProductId)
      );
      const missing = new Set(
        cart.items
          .filter((i) => !available.has(i.providerProductId))
          .map((i) => i.providerProductId)
      );
      setUnavailable(missing);
    } catch {
      // keep cart; availability check is best-effort
    } finally {
      setChecking(false);
    }
  }, [cart]);

  useEffect(() => {
    if (!hydrated || !cart) return;
    void revalidate();
  }, [hydrated, cart?.providerId, revalidate]);

  useEffect(() => {
    getMyProfile()
      .then(() => setIsGuest(false))
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          setIsGuest(true);
        }
      });
    listMyAddresses()
      .then(({ data }) => {
        setAddresses(data);
        const def = data.find((a) => a.isDefault) ?? data[0];
        if (def) setDeliveryAddressId(def.id);
      })
      .catch(() => {
        /* guest */
      });
  }, []);

  useEffect(() => {
    if (!cart) return;
    const pin = readExplorePin();
    const addr = addresses.find((a) => a.id === deliveryAddressId);
    const lat = fulfillment === "DELIVERY" ? addr?.lat : pin?.lat;
    const lng = fulfillment === "DELIVERY" ? addr?.lng : pin?.lng;
    getProviderEta(cart.providerId, {
      lat,
      lng,
      fulfillmentType: fulfillment,
    })
      .then(({ data }) => setEta(data))
      .catch(() => setEta(null));
  }, [cart, fulfillment, deliveryAddressId, addresses]);

  function removeItem(item: CartItem) {
    if (!cart) return;
    save(setItemQuantity(cart, item.providerProductId, 0));
    showToast("Producto quitado");
  }

  async function confirmOrder() {
    if (!cart || hasUnavailable) return;
    if (fulfillment === "DELIVERY" && !deliveryAddressId) return;
    if (isGuest) {
      window.location.href = `/login?next=${encodeURIComponent("/carrito")}`;
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      const pin = readExplorePin();
      const { data } = await createOrder(
        {
          providerId: cart.providerId,
          notes: notes.trim() || undefined,
          items: cart.items.map((i) => ({
            providerProductId: i.providerProductId,
            quantity: qtyToApiString(i.quantity),
            unitOfMeasure: i.unitOfMeasure,
          })),
          fulfillmentType: fulfillment,
          deliveryAddressId: fulfillment === "DELIVERY" ? deliveryAddressId : undefined,
          clientLat: pin?.lat,
          clientLng: pin?.lng,
        },
        idempotencyRef.current
      );
      clearCart();
      setSuccessOrder(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent("/carrito")}`;
        return;
      }
      if (err instanceof ApiError && err.status === 409) {
        setSubmitError("Algunos productos ya no están disponibles. Quita los que no se puedan encargar.");
        void revalidate();
      } else if (err instanceof ApiError) {
        setSubmitError(err.message || "No pudimos enviar tu pedido");
      } else {
        setSubmitError("No pudimos enviar tu pedido");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-gray-200" />
          <div className="h-24 rounded-xl bg-gray-200" />
          <div className="h-24 rounded-xl bg-gray-200" />
          <div className="h-32 rounded-xl bg-gray-200" />
        </div>
      </div>
    );
  }

  if (successOrder) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-8">
        <OrderSuccessPanel order={successOrder} />
      </div>
    );
  }

  if (!cart || itemCount === 0) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-8">
        <EmptyState
          title="Tu carrito está vacío"
          description="Agrega productos desde la frutería para armar tu encargo."
          icon="🛒"
          action={
            <Link
              href="/explorar"
              className="inline-flex min-h-11 items-center rounded-lg bg-[var(--brand)] px-4 py-3 font-semibold text-white"
            >
              Ver fruterías
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 pb-28 lg:pb-8">
      <Link
        href={`/fruteria/${cart.providerId}`}
        className="text-sm font-medium text-[var(--brand)] hover:underline"
      >
        ← Volver a la frutería
      </Link>
      <h1 className="mt-4 text-2xl font-bold">Tu encargo</h1>
      <p className="mt-1 text-sm text-slate-500">
        {cart.providerName}
        {cart.providerAddress ? ` · ${cart.providerAddress}` : ""}
      </p>

      {isGuest && (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">
          Inicia sesión para confirmar tu pedido.{" "}
          <Link href="/login?next=/carrito" className="font-semibold underline">
            Iniciar sesión
          </Link>
        </p>
      )}

      {submitError && (
        <div className="mt-4">
          <ErrorBanner message={submitError} onRetry={() => void confirmOrder()} />
        </div>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-4">
          {checking && (
            <p className="text-xs text-slate-400" aria-live="polite">
              Verificando disponibilidad…
            </p>
          )}
          {cart.items.map((item) => {
            const gone = unavailable.has(item.providerProductId);
            return (
              <div
                key={item.providerProductId}
                className={`flex gap-3 rounded-xl border p-4 ${gone ? "border-amber-200 bg-amber-50/60" : "border-gray-200 bg-white"}`}
              >
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {item.imageUrl ? (
                    <Image src={item.imageUrl} alt="" fill className="object-cover" sizes="48px" />
                  ) : (
                    <ImagePlaceholder variant="product" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.name}</p>
                  {gone ? (
                    <p className="mt-1 flex items-center gap-1 text-sm text-amber-800">
                      <AlertTriangle size={14} aria-hidden />
                      Ya no disponible
                    </p>
                  ) : (
                    <p className="text-sm text-slate-500">
                      {formatCurrency(item.unitPrice)} / {UNIT_LABEL[item.unitOfMeasure]}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {gone ? (
                      <Button variant="secondary" className="py-1.5 text-xs" onClick={() => removeItem(item)}>
                        Quitar
                      </Button>
                    ) : (
                      <>
                        <QuantityStepper
                          value={item.quantity}
                          onChange={(n) => save(setItemQuantity(cart, item.providerProductId, n))}
                          productName={item.name}
                          unitOfMeasure={item.unitOfMeasure}
                        />
                        <span className="ml-auto text-sm font-semibold tabular-nums">
                          {formatCurrency(lineAmount(item.quantity, item.unitPrice))}
                        </span>
                      </>
                    )}
                    {!gone && (
                      <button
                        type="button"
                        onClick={() => removeItem(item)}
                        aria-label={`Quitar ${item.name}`}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {provider?.offersDelivery && (
            <div className="space-y-3 rounded-xl border border-gray-200 p-4">
              <FulfillmentToggle value={fulfillment} onChange={setFulfillment} />
              {fulfillment === "DELIVERY" && (
                <div>
                  <label htmlFor="delivery-address" className="mb-1 block text-sm font-medium">
                    Dirección de entrega
                  </label>
                  {addresses.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      Guarda una dirección favorita en Explorar o en tu cuenta.
                    </p>
                  ) : (
                    <select
                      id="delivery-address"
                      value={deliveryAddressId}
                      onChange={(e) => setDeliveryAddressId(e.target.value)}
                      className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                    >
                      {addresses.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.label} — {a.formattedAddress}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <label htmlFor="order-notes" className="mb-1 block text-sm font-medium">
              Notas para la frutería (opcional)
            </label>
            <textarea
              id="order-notes"
              rows={3}
              maxLength={280}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
              placeholder="Paso por él después de las 6"
            />
            <p className="mt-1 text-xs text-slate-400">{notes.length}/280</p>
          </div>
        </div>

        <aside className="hidden h-fit rounded-xl border border-gray-200 bg-white p-6 lg:sticky lg:top-24 lg:block">
          <CartSummary
            itemCount={itemCount}
            total={total}
            hasUnavailable={hasUnavailable}
            submitting={submitting}
            onConfirm={confirmOrder}
            eta={eta}
            fulfillment={fulfillment}
            deliveryBlocked={fulfillment === "DELIVERY" && !deliveryAddressId}
          />
        </aside>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white px-4 py-3 lg:hidden">
        <CartSummary
          itemCount={itemCount}
          total={total}
          hasUnavailable={hasUnavailable}
          submitting={submitting}
          onConfirm={confirmOrder}
          compact
          eta={eta}
          fulfillment={fulfillment}
          deliveryBlocked={fulfillment === "DELIVERY" && !deliveryAddressId}
        />
      </div>
    </div>
  );
}

function CartSummary({
  itemCount,
  total,
  hasUnavailable,
  submitting,
  onConfirm,
  compact = false,
  eta,
  fulfillment = "PICKUP",
  deliveryBlocked = false,
}: {
  itemCount: number;
  total: number;
  hasUnavailable: boolean;
  submitting: boolean;
  onConfirm: () => void;
  compact?: boolean;
  eta?: ProviderEta | null;
  fulfillment?: FulfillmentType;
  deliveryBlocked?: boolean;
}) {
  return (
    <div className={compact ? "flex items-center justify-between gap-3" : "space-y-4"}>
      <div>
        {!compact && (
          <>
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatCurrency(total)}</span>
            </div>
            <div className="mt-2 flex justify-between text-base font-semibold">
              <span>Total</span>
              <span className="tabular-nums" aria-live="polite">
                {formatCurrency(total)}
              </span>
            </div>
            {eta ? <EtaChip eta={eta} className="mt-3" /> : (
              <p className="mt-3 text-xs text-slate-400">Estimación de tiempo no disponible</p>
            )}
            {fulfillment === "PICKUP" ? <PickupNotice className="mt-3" /> : (
              <p className="mt-3 text-sm text-slate-600">Pagas al recibir</p>
            )}
            <p className="mt-1 text-xs text-slate-400">Sin pago en línea</p>
          </>
        )}
        {compact && (
          <p className="font-semibold tabular-nums" aria-live="polite">
            Total {formatCurrency(total)}
          </p>
        )}
        {hasUnavailable && (
          <p className="mt-2 text-xs text-amber-700">Quita los productos no disponibles</p>
        )}
        {deliveryBlocked && (
          <p className="mt-2 text-xs text-amber-700">Elige una dirección de entrega</p>
        )}
      </div>
      <Button
        className={compact ? "h-14 min-w-40" : "h-14 w-full"}
        onClick={onConfirm}
        disabled={hasUnavailable || itemCount === 0 || deliveryBlocked}
        loading={submitting}
        loadingText="Enviando…"
      >
        Confirmar pedido
      </Button>
    </div>
  );
}

