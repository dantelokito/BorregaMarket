import { AlertTriangle } from "lucide-react";

export function LowStockBadge({ show }: { show: boolean }) {
  if (!show) {
    return <span className="text-sm text-slate-400">—</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 text-sm font-medium text-amber-800">
      <AlertTriangle size={16} aria-hidden />
      Poca existencia
    </span>
  );
}
