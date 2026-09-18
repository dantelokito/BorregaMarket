import type { InventoryMovementKind, ShrinkageReason } from "@/lib/api/inventory";

export const SHRINKAGE_REASONS: { value: ShrinkageReason; label: string }[] = [
  { value: "CADUCIDAD", label: "Caducidad" },
  { value: "DANO", label: "Daño" },
  { value: "ROBO", label: "Robo" },
  { value: "MUESTRA", label: "Muestra" },
  { value: "OTRO", label: "Otro" },
];

export const MOVEMENT_KIND_LABEL: Record<InventoryMovementKind, string> = {
  ENTRADA: "Entrada",
  MERMA: "Merma",
  AJUSTE: "Ajuste",
};

export const MOVEMENT_KIND_CLASS: Record<InventoryMovementKind, string> = {
  ENTRADA: "bg-sky-100 text-sky-900",
  MERMA: "bg-amber-100 text-amber-900",
  AJUSTE: "bg-slate-200 text-slate-800",
};

export function shrinkageReasonLabel(reason: ShrinkageReason | null | undefined): string {
  if (!reason) return "—";
  return SHRINKAGE_REASONS.find((r) => r.value === reason)?.label ?? reason;
}

export function parseAdjustmentDelta(counted: number, onHand: number): number {
  return Math.round((counted - onHand) * 1000) / 1000;
}
