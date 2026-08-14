"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, Zap } from "lucide-react";
import { getMyProducts } from "@/lib/api/provider-panel";
import { createPosSale } from "@/lib/api/provider-ops";
import { ApiError } from "@/lib/api/client";
import type { CatalogItem, Order, UnitOfMeasure } from "@/lib/api/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Button } from "@/components/ui/Button";
import { QuickSaleBadge } from "@/components/ui/QuickSaleBadge";
import { OrderStatusBadge } from "@/components/ui/OrderStatusBadge";
import { QuantityInput } from "./QuantityInput";
import { NumericKeypad } from "./NumericKeypad";
import { UnitSelector } from "./UnitSelector";
import { PaymentMethodSelector } from "./PaymentMethodSelector";
import { QuickSaleModal, type QuickSaleDraft } from "./QuickSaleModal";
import { ScaleStatusBadge } from "./ScaleStatusBadge";
import { usePosScale } from "./usePosScale";
import { formatCurrency, formatQty, lineAmount, parseDecimalInput, qtyToApiString } from "@/lib/format";
import { PAYMENT_METHOD_LABEL, UNIT_LABEL, shortOrderId, toUnitOfMeasure } from "@/lib/orders/labels";
import { gramsToQuantity, isWeighableUnit } from "@/lib/pos/scale";

interface TicketLine {
  key: string;
  providerProductId?: string;
  name: string;
  unitPrice: number;
  quantity: number;
  unitOfMeasure: UnitOfMeasure;
  isQuickSale: boolean;
}

export function PosPageClient() {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [lines, setLines] = useState<TicketLine[]>([]);
  const [editing, setEditing] = useState<TicketLine | null>(null);
  const [qtyDraft, setQtyDraft] = useState("1");
  const [qtyError, setQtyError] = useState("");
  const [payment, setPayment] = useState<"CASH" | "OTHER">("CASH");
  const [pickupLater, setPickupLater] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [charging, setCharging] = useState(false);
  const [chargeError, setChargeError] = useState("");
  const [ticket, setTicket] = useState<Order | null>(null);
  const [activeLineKey, setActiveLineKey] = useState<string | null>(null);
  const [scaleHint, setScaleHint] = useState("");
  const idempotencyRef = useRef(crypto.randomUUID());
  const activeLineKeyRef = useRef<string | null>(null);
  const linesRef = useRef(lines);
  const editingRef = useRef(editing);
  activeLineKeyRef.current = activeLineKey;
  linesRef.current = lines;
  editingRef.current = editing;

  const applyScaleWeight = useCallback((grams: number) => {
    const key = activeLineKeyRef.current;
    if (!key) return;
    const line = linesRef.current.find((l) => l.key === key);
    if (!line || line.isQuickSale) return;
    const qty = gramsToQuantity(grams, line.unitOfMeasure);
    if (qty == null) return;
    setScaleHint("");
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, quantity: qty } : l)));
    setEditing((current) => {
      if (!current || current.key !== key) return current;
      return { ...current, quantity: qty };
    });
    if (editingRef.current?.key === key) {
      setQtyDraft(formatQty(qty));
    }
  }, []);

  const scale = usePosScale({
    onWeightChange: applyScaleWeight,
    onParseError: () => {
      setScaleHint("No pudimos leer el peso. Elige el modelo o usa el teclado.");
    },
  });

  async function load() {
    setLoading(true);
    setError("");
    try {
      const { data } = await getMyProducts();
      setCatalog(data.catalog);
      setBusinessName(data.provider.businessName);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos cargar el catálogo");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const available = catalog.filter((c) => c.isAvailable && c.providerProductId && c.price != null);
  const filtered = available.filter((c) =>
    c.product.name.toLowerCase().includes(query.trim().toLowerCase())
  );
  const total = lines.reduce((sum, l) => sum + lineAmount(l.quantity, l.unitPrice), 0);

  function addCatalogItem(item: CatalogItem) {
    const id = item.providerProductId;
    const price = item.price;
    if (!id || price == null) return;
    const unit = toUnitOfMeasure(item.product.unit);
    const weighable = isWeighableUnit(unit);
    const existing = lines.find((l) => l.providerProductId === id);
    if (existing) {
      if (weighable) {
        setActiveLineKey(existing.key);
        setEditing(existing);
        setQtyDraft(formatQty(existing.quantity));
        setQtyError("");
        return;
      }
      setLines((prev) =>
        prev.map((l) =>
          l.key === existing.key ? { ...l, quantity: l.quantity + 1 } : l
        )
      );
      return;
    }
    setLines((prev) => [
      ...prev,
      {
        key: id,
        providerProductId: id,
        name: item.product.name,
        unitPrice: price,
        quantity: 1,
        unitOfMeasure: unit,
        isQuickSale: false,
      },
    ]);
    if (weighable) setActiveLineKey(id);
  }

  function addQuickSale(draft: QuickSaleDraft) {
    const price = parseDecimalInput(draft.unitPrice) ?? 0;
    const qty = parseDecimalInput(draft.quantity) ?? 1;
    setLines((prev) => [
      ...prev,
      {
        key: `qs-${crypto.randomUUID()}`,
        name: draft.name,
        unitPrice: price,
        quantity: qty,
        unitOfMeasure: draft.unitOfMeasure,
        isQuickSale: true,
      },
    ]);
    setQuickOpen(false);
  }

  function applyQtyEdit() {
    if (!editing) return;
    const qty = parseDecimalInput(qtyDraft);
    if (qty == null || qty <= 0) {
      setQtyError("Cantidad inválida (máximo 3 decimales)");
      return;
    }
    setLines((prev) =>
      prev.map((l) =>
        l.key === editing.key ? { ...l, quantity: qty, unitOfMeasure: editing.unitOfMeasure } : l
      )
    );
    setEditing(null);
    setQtyError("");
  }

  async function charge() {
    if (lines.length === 0) return;
    setCharging(true);
    setChargeError("");
    try {
      const { data } = await createPosSale(
        {
          paymentMethod: payment,
          status: pickupLater ? "CONFIRMED" : "DELIVERED",
          items: lines.map((l) =>
            l.isQuickSale
              ? {
                  customItem: { name: l.name, unitPrice: l.unitPrice.toFixed(2) },
                  quantity: qtyToApiString(l.quantity),
                  unitOfMeasure: l.unitOfMeasure,
                }
              : {
                  providerProductId: l.providerProductId as string,
                  quantity: qtyToApiString(l.quantity),
                  unitOfMeasure: l.unitOfMeasure,
                }
          ),
        },
        idempotencyRef.current
      );
      setTicket(data);
      setLines([]);
      setActiveLineKey(null);
      setEditing(null);
    } catch (err) {
      if (err instanceof ApiError) setChargeError(err.message || "No pudimos cobrar la venta");
      else setChargeError("No pudimos cobrar la venta");
    } finally {
      setCharging(false);
    }
  }

  function newSale() {
    setTicket(null);
    setLines([]);
    setChargeError("");
    setActiveLineKey(null);
    setEditing(null);
    idempotencyRef.current = crypto.randomUUID();
  }

  if (ticket) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <div id="pos-ticket" className="rounded-xl border border-gray-200 bg-white p-6">
          <h1 className="text-center text-xl font-bold">{ticket.providerName ?? businessName}</h1>
          <p className="text-center text-sm text-slate-500">
            Ticket #{shortOrderId(ticket.id)} ·{" "}
            <time dateTime={ticket.createdAt}>
              {new Date(ticket.createdAt).toLocaleString("es-MX")}
            </time>
          </p>
          <div className="mt-2 flex justify-center">
            <OrderStatusBadge status={ticket.status} />
          </div>
          <ul className="mt-6 space-y-3">
            {ticket.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-2 text-sm">
                <div>
                  <p className="font-medium">
                    {item.itemName}{" "}
                    {!item.providerProductId && <QuickSaleBadge />}
                  </p>
                  <p className="tabular-nums text-slate-500">
                    {formatQty(item.quantity)} {UNIT_LABEL[item.unitOfMeasure]} ×{" "}
                    {formatCurrency(item.unitPrice)}
                  </p>
                </div>
                <span className="font-semibold tabular-nums">{formatCurrency(item.subtotal)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 flex justify-between text-lg font-bold">
            Total <span className="tabular-nums">{formatCurrency(ticket.total)}</span>
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {PAYMENT_METHOD_LABEL[ticket.paymentMethod]}
          </p>
        </div>
        <div className="mt-6 flex flex-col gap-2 print:hidden">
          <Button className="h-14 w-full" onClick={newSale}>
            Nueva venta
          </Button>
          <Button variant="secondary" className="w-full" onClick={() => window.print()}>
            Imprimir
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col lg:h-[calc(100vh-9rem)] lg:flex-row">
      <section className="flex-1 overflow-y-auto p-4 lg:w-[58%] lg:border-r">
        <div className="mb-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar producto"
              className="h-12 w-full rounded-lg border border-gray-300 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            />
          </div>
          <Button type="button" variant="secondary" onClick={() => setQuickOpen(true)}>
            <Zap size={16} aria-hidden />
            Venta rápida
          </Button>
        </div>

        {error && <ErrorBanner message={error} onRetry={() => void load()} />}

        {loading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-200" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={query ? "Sin resultados" : "No hay productos activos"}
            description="Agrega una línea libre al ticket."
            action={
              <Button type="button" onClick={() => setQuickOpen(true)}>
                + Venta rápida
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {filtered.map((item) => (
              <button
                key={item.product.id}
                type="button"
                onClick={() => addCatalogItem(item)}
                className="rounded-xl border border-gray-200 bg-white p-4 text-left hover:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
              >
                <p className="font-medium">{item.product.name}</p>
                <p className="mt-1 text-sm font-semibold tabular-nums">
                  {formatCurrency(item.price ?? 0)} / {toUnitOfMeasure(item.product.unit)}
                </p>
              </button>
            ))}
          </div>
        )}
      </section>

      <aside className="flex flex-col border-t bg-white lg:w-[42%] lg:border-l lg:border-t-0">
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Ticket</h2>
          </div>
          <ScaleStatusBadge
            status={scale.status}
            driver={scale.driver}
            drivers={scale.drivers}
            liveGrams={scale.liveGrams}
            onConnect={() => void scale.connect()}
            onDisconnect={() => void scale.disconnect()}
            onSelectDriver={scale.selectDriver}
          />
          {scaleHint ? (
            <p className="mt-2 text-xs text-amber-800" role="status">
              {scaleHint}
            </p>
          ) : null}
          {lines.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">Toca un producto o usa Venta rápida.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {lines.map((line) => (
                <li key={line.key}>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(line);
                      setQtyDraft(formatQty(line.quantity));
                      setQtyError("");
                      if (!line.isQuickSale && isWeighableUnit(line.unitOfMeasure)) {
                        setActiveLineKey(line.key);
                      }
                    }}
                    className={`w-full rounded-lg border p-3 text-left hover:bg-slate-50 ${
                      line.key === activeLineKey
                        ? "border-[var(--brand)] ring-2 ring-[var(--brand)]"
                        : "border-gray-200"
                    }`}
                  >
                    <div className="flex justify-between gap-2">
                      <span className="font-medium">
                        {line.name} {line.isQuickSale && <QuickSaleBadge />}
                      </span>
                      <span className="tabular-nums font-semibold">
                        {formatCurrency(lineAmount(line.quantity, line.unitPrice))}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 tabular-nums">
                      {formatQty(line.quantity)} {UNIT_LABEL[line.unitOfMeasure]} ×{" "}
                      {formatCurrency(line.unitPrice)}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {editing && (
            <div className="mt-4 space-y-3 rounded-lg border border-gray-200 p-3">
              <p className="text-sm font-medium">Editar {editing.name}</p>
              <QuantityInput value={qtyDraft} onChange={setQtyDraft} error={qtyError} />
              <NumericKeypad
                onDigit={(d) => setQtyDraft((prev) => (prev === "0" ? d : prev + d))}
                onDecimal={() =>
                  setQtyDraft((prev) => (prev.includes(".") ? prev : `${prev || "0"}.`))
                }
                onBackspace={() => setQtyDraft((prev) => prev.slice(0, -1) || "0")}
              />
              <UnitSelector
                value={editing.unitOfMeasure}
                onChange={(u) => setEditing({ ...editing, unitOfMeasure: u })}
                priceHint={`Precio por ${editing.unitOfMeasure}`}
              />
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    setLines((prev) => prev.filter((l) => l.key !== editing.key));
                    if (activeLineKey === editing.key) setActiveLineKey(null);
                    setEditing(null);
                  }}
                >
                  Quitar
                </Button>
                <Button className="flex-1" onClick={applyQtyEdit}>
                  Guardar
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 space-y-3 border-t border-gray-200 bg-white p-4 lg:static">
          {chargeError && <ErrorBanner message={chargeError} onRetry={() => void charge()} />}
          <p className="flex justify-between text-lg font-bold" aria-live="polite">
            Total <span className="tabular-nums">{formatCurrency(total)}</span>
          </p>
          <PaymentMethodSelector value={payment} onChange={setPayment} />
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={pickupLater}
              onChange={(e) => setPickupLater(e.target.checked)}
            />
            Para recoger más tarde
          </label>
          <Button
            className="h-14 w-full"
            disabled={lines.length === 0}
            loading={charging}
            loadingText="Cobrando…"
            onClick={() => void charge()}
          >
            Cobrar {formatCurrency(total)}
          </Button>
        </div>
      </aside>

      <QuickSaleModal open={quickOpen} onClose={() => setQuickOpen(false)} onAdd={addQuickSale} />
    </div>
  );
}
