"use client";

import { useEffect, useId, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { InventoryItem, PatchInventoryInput } from "@/lib/api/inventory";
import { parseDecimalInput, qtyToApiString } from "@/lib/format";
import { parseQtyString } from "@/lib/inventory/capacity";
import { onHandIsNonZero, reservedIsPositive } from "@/lib/catalog/f13";
import {
  ActiveOrderBlockAlert,
  UnitChangeConfirmDialog,
} from "@/components/provider/catalog/UnitChangeConfirmDialog";

export function InventorySkuSheet({
  item,
  open,
  busy,
  apiError,
  fieldErrors,
  onClose,
  onSubmit,
}: {
  item: InventoryItem | null;
  open: boolean;
  busy: boolean;
  apiError?: string;
  fieldErrors?: Record<string, string>;
  onClose: () => void;
  onSubmit: (input: PatchInventoryInput) => Promise<boolean>;
}) {
  const titleId = useId();
  const [capacity, setCapacity] = useState("");
  const [threshold, setThreshold] = useState("10");
  const [alertOn, setAlertOn] = useState(true);
  const [factor, setFactor] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [discardOpen, setDiscardOpen] = useState(false);
  const [encargarOpen, setEncargarOpen] = useState(false);
  const [pending, setPending] = useState<PatchInventoryInput | null>(null);

  useEffect(() => {
    if (!open || !item) return;
    setCapacity(item.capacityMax ?? "");
    setThreshold(String(item.alertThresholdPercent || 10));
    setAlertOn(item.alertEnabled);
    setFactor(item.boxContentFactor ?? "");
    setErrors({});
  }, [open, item]);

  if (!open || !item) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    const cap = parseDecimalInput(capacity);
    if (cap == null || cap <= 0) {
      next.capacityMax = "El tope debe ser mayor que cero";
    }
    const th = Number(threshold);
    if (!Number.isInteger(th) || th < 1 || th > 100) {
      next.alertThresholdPercent = "El umbral debe ser un entero entre 1 y 100";
    }
    let factorPayload: string | null | undefined = undefined;
    if (factor.trim() === "") {
      factorPayload = null;
    } else {
      const f = parseDecimalInput(factor);
      if (f == null || f <= 0) {
        next.boxContentFactor = "El factor caja debe ser mayor que cero";
      } else {
        factorPayload = qtyToApiString(f);
      }
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    const payload: PatchInventoryInput = {
      capacityMax: qtyToApiString(cap!),
      alertThresholdPercent: th,
      alertEnabled: alertOn,
      boxContentFactor: factorPayload,
    };
    if (!item) return;
    const prevFactor = item.boxContentFactor ?? null;
    const nextFactor = factorPayload === undefined ? prevFactor : factorPayload;
    const factorChanged = String(prevFactor ?? "") !== String(nextFactor ?? "");
    if (factorChanged && reservedIsPositive(item.reserved)) {
      setEncargarOpen(true);
      return;
    }
    if (factorChanged && onHandIsNonZero(item.onHand)) {
      setPending(payload);
      setDiscardOpen(true);
      return;
    }
    const ok = await onSubmit(payload);
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
              Ficha de existencias
            </h2>
            <p className="text-sm text-slate-500">
              {item.name} · {item.effectiveSaleUnit ?? item.unit}
            </p>
          </div>
          <button type="button" className="min-h-11 min-w-11 rounded-lg hover:bg-gray-100" onClick={onClose} aria-label="Cerrar">
            <X size={20} aria-hidden />
          </button>
        </header>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
          <Input
            label="Tope / capacidad"
            name="capacityMax"
            inputMode="decimal"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            error={errors.capacityMax ?? fieldErrors?.capacityMax}
            required
          />
          <Input
            label="Umbral de alerta (%)"
            name="alertThresholdPercent"
            inputMode="numeric"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            error={errors.alertThresholdPercent ?? fieldErrors?.alertThresholdPercent}
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">Alerta de poca existencia</span>
            <button
              type="button"
              role="switch"
              aria-checked={alertOn}
              aria-label="Alerta de poca existencia"
              onClick={() => setAlertOn((v) => !v)}
              className={`relative inline-flex h-11 min-h-11 min-w-11 w-14 items-center rounded-full px-1 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] ${
                alertOn ? "bg-[var(--brand)]" : "bg-slate-300"
              }`}
            >
              <span
                className={`inline-block h-9 w-9 rounded-full bg-white shadow transition-transform ${
                  alertOn ? "translate-x-3" : "translate-x-0"
                }`}
                aria-hidden
              />
            </button>
          </div>
          <p className="text-xs text-slate-500">Apagado: nunca muestra badge.</p>
          <Input
            label={`Factor caja (1 caja = N ${item.unit})`}
            name="boxContentFactor"
            inputMode="decimal"
            value={factor}
            onChange={(e) => setFactor(e.target.value)}
            error={errors.boxContentFactor ?? fieldErrors?.boxContentFactor}
          />
          <p className="text-xs text-slate-500">
            Fijo en esta sucursal; no por cada carga. Sin receta/BOM.
            {parseQtyString(item.onHand) !== 0 ? ` Saldo actual: ${item.onHand} ${item.unit}.` : ""}
          </p>
          {apiError ? (
            <p className="text-sm text-red-600" role="alert">
              {apiError}
            </p>
          ) : null}
          <Button type="submit" className="mt-auto min-h-11 w-full" loading={busy} loadingText="Guardando…">
            Guardar ficha
          </Button>
        </form>
      </div>
      <UnitChangeConfirmDialog
        open={discardOpen}
        onCancel={() => {
          setDiscardOpen(false);
          setPending(null);
        }}
        onConfirm={() => {
          const payload = pending;
          setDiscardOpen(false);
          setPending(null);
          if (!payload) return;
          void onSubmit({ ...payload, confirmDiscard: true }).then((ok) => {
            if (ok) onClose();
          });
        }}
      />
      <ActiveOrderBlockAlert open={encargarOpen} onClose={() => setEncargarOpen(false)} />
    </div>
  );
}
