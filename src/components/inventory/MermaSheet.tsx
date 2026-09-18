"use client";

import { useEffect, useId, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { InventoryItem, ShrinkageReason } from "@/lib/api/inventory";
import { formatQty, parseDecimalInput, qtyToApiString } from "@/lib/format";
import { parseQtyString } from "@/lib/inventory/capacity";
import { SHRINKAGE_REASONS } from "@/lib/inventory/movements-ui";

export function MermaSheet({
  item,
  open,
  busy,
  apiError,
  onClose,
  onSubmit,
}: {
  item: InventoryItem | null;
  open: boolean;
  busy: boolean;
  apiError?: string;
  onClose: () => void;
  onSubmit: (input: { quantity: string; reason: ShrinkageReason; note?: string }) => Promise<boolean>;
}) {
  const titleId = useId();
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState<ShrinkageReason | "">("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [reasonError, setReasonError] = useState("");

  useEffect(() => {
    if (!open) return;
    setQty("");
    setReason("");
    setNote("");
    setError("");
    setReasonError("");
  }, [open, item?.providerProductId]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  if (!open || !item) return null;

  const onHand = parseQtyString(item.onHand);
  const unit = item.effectiveSaleUnit ?? item.unit;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseDecimalInput(qty);
    if (n == null || n <= 0) {
      setError("Indica una cantidad mayor que cero");
      return;
    }
    if (!reason) {
      setReasonError("Elige un motivo");
      return;
    }
    setError("");
    setReasonError("");
    const ok = await onSubmit({
      quantity: qtyToApiString(n),
      reason,
      note: note.trim() || undefined,
    });
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
              Registrar merma
            </h2>
            <p className="text-sm text-slate-500">
              {item.name} · {unit}
            </p>
            <p className="mt-1 text-sm text-slate-700">
              Saldo actual: {formatQty(onHand)} {unit}
            </p>
          </div>
          <button type="button" className="min-h-11 min-w-11 rounded-lg hover:bg-gray-100" onClick={onClose} aria-label="Cerrar">
            <X size={20} aria-hidden />
          </button>
        </header>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
          <Input
            label="Cantidad"
            name="merma-qty"
            inputMode="decimal"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            error={error}
            required
          />
          <div>
            <label htmlFor="merma-reason" className="mb-1 block text-sm font-medium">
              Motivo
            </label>
            <select
              id="merma-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value as ShrinkageReason | "")}
              className={`min-h-11 w-full rounded-lg border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)] ${
                reasonError ? "border-red-500" : "border-gray-300"
              }`}
              required
            >
              <option value="">Selecciona</option>
              {SHRINKAGE_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            {reasonError ? (
              <p className="mt-1 text-sm text-red-600" role="alert">
                {reasonError}
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor="merma-note" className="mb-1 block text-sm font-medium">
              Nota (opcional)
            </label>
            <textarea
              id="merma-note"
              maxLength={200}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-20 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            />
          </div>
          <p className="text-xs text-slate-500">Esto no es una venta del POS.</p>
          {apiError ? (
            <p className="text-sm text-red-600" role="alert">
              {apiError}
            </p>
          ) : null}
          <Button type="submit" className="mt-auto min-h-11 w-full sticky bottom-0" loading={busy} loadingText="Registrando…">
            Registrar merma
          </Button>
        </form>
      </div>
    </div>
  );
}
