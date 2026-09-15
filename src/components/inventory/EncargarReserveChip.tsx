import { Package } from "lucide-react";
import { parseQtyString } from "@/lib/inventory/capacity";
import { formatQty } from "@/lib/format";

export function EncargarReserveChip({
  reserved,
  unit,
}: {
  reserved: string;
  unit: string;
}) {
  const n = parseQtyString(reserved);
  if (n <= 0) {
    return <span className="text-sm text-slate-400">Sin reserva</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 text-sm text-slate-800">
      <Package size={16} aria-hidden />
      Reserva {formatQty(n)} {unit}
    </span>
  );
}
