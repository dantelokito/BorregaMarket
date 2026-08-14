import { Zap } from "lucide-react";

export function QuickSaleBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 print:bg-transparent print:p-0 ${className}`}
    >
      <Zap size={12} className="print:hidden" aria-hidden />
      Venta rápida
    </span>
  );
}
