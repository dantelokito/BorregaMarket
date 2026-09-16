"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export function UnitChangeConfirmDialog({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <ConfirmDialog
      open={open}
      title="El inventario actual se descartará"
      description="El saldo pasará a 0. Afecta POS, Encargar e inventario. Si cambió el formato de venta, conviene dar de alta un producto nuevo. Esto no es una entrada de almacén."
      confirmLabel="Descartar inventario y guardar"
      cancelLabel="Cancelar"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

export function ActiveOrderBlockAlert({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Cerrar" onClick={onClose} />
      <div
        role="alert"
        className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-lg"
      >
        <div className="mb-3 flex items-start gap-2 text-red-600">
          <AlertTriangle size={20} aria-hidden />
          <h2 className="text-lg font-semibold text-slate-900">No se puede cambiar la unidad</h2>
        </div>
        <p className="text-sm text-slate-600">
          Completa o cancela los encargos de este producto antes de cambiar la unidad o el factor.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" className="min-h-11" onClick={onClose}>
            Cerrar
          </Button>
          <Button
            type="button"
            className="min-h-11"
            onClick={() => {
              window.location.href = "/proveedor/dashboard?view=ordenes";
            }}
          >
            Ir a Órdenes
          </Button>
        </div>
      </div>
    </div>
  );
}
