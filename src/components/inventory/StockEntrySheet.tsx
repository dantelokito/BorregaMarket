"use client";

import { useEffect, useId, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { InventoryItem } from "@/lib/api/inventory";
import { parseDecimalInput, qtyToApiString } from "@/lib/format";
import { formatQty } from "@/lib/format";
import { parseQtyString } from "@/lib/inventory/capacity";

export function StockEntrySheet({
  item,
  open,
  busy,
  apiError,
  onClose,
  onSubmit,
  onOpenFicha,
}: {
  item: InventoryItem | null;
  open: boolean;
  busy: boolean;
  apiError?: string;
  onClose: () => void;
  onSubmit: (quantity: string) => Promise<boolean>;
  onOpenFicha: () => void;
}) {
  const titleId = useId();
  const [qty, setQty] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setQty("");
    setError("");
  }, [open, item?.providerProductId]);

  if (!open || !item) return null;

  const factor = parseQtyString(item.boxContentFactor ?? undefined);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseDecimalInput(qty);
    if (n == null || n <= 0) {
      setError("Indica una cantidad mayor que cero");
      return;
    }
    setError("");
    const ok = await onSubmit(qtyToApiString(n));
    if (ok) onClose();
  }

  return (
    <div className="fixed inset-0 z-[80] flex justify-end">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Cerrar" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex h-full w-full max-w-md flex-col bg-white shadow-xl"
      >
        <header className="flex items-start justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold">
              Registrar entrada
            </h2>
            <p className="text-sm text-slate-500">
              {item.name} · {item.unit}
            </p>
          </div>
          <button type="button" className="min-h-11 min-w-11 rounded-lg hover:bg-gray-100" onClick={onClose} aria-label="Cerrar">
            <X size={20} aria-hidden />
          </button>
        </header>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
          <p className="text-sm">
            <span className="font-medium">Unidad (catálogo)</span>
            <span className="ml-2 text-slate-600">{item.unit}</span>
          </p>
          <Input
            label="Cantidad"
            name="entry-qty"
            inputMode="decimal"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            error={error}
            required
          />
          <p className="text-xs text-slate-500">Se suma al saldo actual (puede estar mal o negativo).</p>
          {factor > 0 ? (
            <p className="text-sm text-slate-700">
              1 caja = {formatQty(factor)} {item.unit}{" "}
              <button type="button" className="text-[var(--brand)] underline" onClick={onOpenFicha}>
                Editar ficha
              </button>
            </p>
          ) : null}
          {apiError ? (
            <p className="text-sm text-red-600" role="alert">
              {apiError}
            </p>
          ) : null}
          <Button type="submit" className="mt-auto min-h-11 w-full" loading={busy} loadingText="Registrando…">
            Registrar entrada
          </Button>
        </form>
      </div>
    </div>
  );
}
