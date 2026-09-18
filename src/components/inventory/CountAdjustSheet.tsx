"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { InventoryItem } from "@/lib/api/inventory";
import { formatQty, parseDecimalInput, qtyToApiString } from "@/lib/format";
import { parseQtyString } from "@/lib/inventory/capacity";
import { parseAdjustmentDelta } from "@/lib/inventory/movements-ui";

export function CountAdjustSheet({
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
  onSubmit: (input: { countedOnHand: string; note?: string }) => Promise<boolean>;
}) {
  const titleId = useId();
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setQty("");
    setNote("");
    setError("");
  }, [open, item?.providerProductId]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  const onHand = item ? parseQtyString(item.onHand) : 0;
  const counted = parseDecimalInput(qty);
  const delta = useMemo(
    () => (counted == null ? null : parseAdjustmentDelta(counted, onHand)),
    [counted, onHand]
  );

  if (!open || !item) return null;
  const unit = item.effectiveSaleUnit ?? item.unit;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseDecimalInput(qty);
    if (n == null || n < 0) {
      setError("El conteo debe ser mayor o igual a cero");
      return;
    }
    setError("");
    const ok = await onSubmit({
      countedOnHand: qtyToApiString(n),
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
              Ajuste por conteo
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
            label="Conteo físico"
            name="adjust-qty"
            inputMode="decimal"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            error={error}
            required
          />
          <p className="text-sm text-slate-700" role="status">
            Delta: {delta == null ? "—" : `${delta > 0 ? "+" : ""}${formatQty(delta)} ${unit}`}
          </p>
          <div>
            <label htmlFor="adjust-note" className="mb-1 block text-sm font-medium">
              Nota (opcional)
            </label>
            <textarea
              id="adjust-note"
              maxLength={200}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-20 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            />
          </div>
          {apiError ? (
            <p className="text-sm text-red-600" role="alert">
              {apiError}
            </p>
          ) : null}
          <Button type="submit" className="mt-auto min-h-11 w-full" loading={busy} loadingText="Registrando…">
            Registrar ajuste
          </Button>
        </form>
      </div>
    </div>
  );
}
