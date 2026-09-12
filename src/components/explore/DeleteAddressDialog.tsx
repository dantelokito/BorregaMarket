"use client";

import { useEffect, useId, useRef } from "react";
import { Button } from "@/components/ui/Button";

interface DeleteAddressDialogProps {
  open: boolean;
  label: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteAddressDialog({
  open,
  label,
  onConfirm,
  onCancel,
}: DeleteAddressDialogProps) {
  const titleId = useId();
  const descId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-lg"
      >
        <h2 id={titleId} className="text-lg font-semibold text-slate-900">
          ¿Borrar {label}?
        </h2>
        <p id={descId} className="mt-2 text-sm text-slate-500">
          El mapa se queda en este punto.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button ref={cancelRef} type="button" variant="secondary" className="min-h-11" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="min-h-11 bg-red-600 hover:bg-red-700"
            onClick={onConfirm}
          >
            Borrar
          </Button>
        </div>
      </div>
    </div>
  );
}
