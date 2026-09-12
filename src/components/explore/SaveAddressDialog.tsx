"use client";

import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface SaveAddressDialogProps {
  open: boolean;
  previewAddress: string;
  initialLabel?: string;
  saving?: boolean;
  error?: string;
  onSave: (label: string) => void;
  onCancel: () => void;
}

export function SaveAddressDialog({
  open,
  previewAddress,
  initialLabel = "Casa",
  saving,
  error,
  onSave,
  onCancel,
}: SaveAddressDialogProps) {
  const titleId = useId();
  const inputId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState(initialLabel.slice(0, 40));

  useEffect(() => {
    if (!open) return;
    setLabel((initialLabel || "Casa").slice(0, 40));
    inputRef.current?.focus();
  }, [open, initialLabel]);

  useEffect(() => {
    if (!open) return;
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
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-lg"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-lg font-semibold text-slate-900">
            Guardar ubicación
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            aria-label="Cerrar"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        <p className="mt-2 text-sm text-slate-500">{previewAddress}</p>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const next = label.trim().slice(0, 40);
            if (!next) return;
            onSave(next);
          }}
        >
          <div>
            <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-slate-700">
              Nombre
            </label>
            <input
              ref={inputRef}
              id={inputId}
              value={label}
              maxLength={40}
              onChange={(e) => setLabel(e.target.value.slice(0, 40))}
              placeholder="Casa, Trabajo"
              aria-describedby={error ? errorId : undefined}
              className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            />
            {error && (
              <p id={errorId} className="mt-1 text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" className="min-h-11" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" className="min-h-11" loading={saving} disabled={!label.trim()}>
              Guardar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
