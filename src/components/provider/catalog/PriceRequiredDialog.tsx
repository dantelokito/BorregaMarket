"use client";

import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { canPublishPrice } from "@/lib/catalog/activate-price";

export function PriceRequiredDialog({
  open,
  productName,
  busy,
  apiError,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  productName: string;
  busy?: boolean;
  apiError?: string;
  onCancel: () => void;
  onConfirm: (price: number) => Promise<void> | void;
}) {
  const titleId = useId();
  const [raw, setRaw] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setRaw("");
    setError("");
  }, [open, productName]);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const price = Number(raw.replace(",", "."));
    if (!canPublishPrice(price)) {
      setError("El precio debe ser mayor que cero");
      return;
    }
    setError("");
    await onConfirm(price);
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Cerrar" onClick={onCancel} />
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={(e) => void submit(e)}
        className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-lg"
      >
        <h2 id={titleId} className="text-lg font-semibold text-slate-900">
          Poner a la venta · {productName}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Este producto aún no tiene precio en tu frutería. Indica un precio mayor que cero. No
          usamos un default.
        </p>
        <div className="mt-4">
          <Input
            label="Precio de tu frutería"
            name="activate-price"
            inputMode="decimal"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            error={error || apiError}
            required
          />
          <p className="mt-1 text-xs text-slate-500">MXN</p>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" className="min-h-11" onClick={onCancel} disabled={busy}>
            Cancelar
          </Button>
          <Button type="submit" className="min-h-11" loading={busy} loadingText="Guardando…">
            Poner a la venta
          </Button>
        </div>
      </form>
    </div>
  );
}
