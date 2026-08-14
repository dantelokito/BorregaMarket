import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { formatCurrency } from "@/lib/format";

interface CartSummaryBarProps {
  itemCount: number;
  total: number;
  href: string;
  sticky?: boolean;
}

export function CartSummaryBar({ itemCount, total, href, sticky = false }: CartSummaryBarProps) {
  if (itemCount <= 0) return null;

  const inner = (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-medium text-slate-800" aria-live="polite">
        {itemCount} {itemCount === 1 ? "producto" : "productos"} · {formatCurrency(total)}
      </p>
      <Link
        href={href}
        className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--brand-dark)]"
      >
        Ver carrito →
      </Link>
    </div>
  );

  if (sticky) {
    return (
      <div className="sticky bottom-0 z-30 border-t border-gray-200 bg-white px-4 py-3 transition-all duration-200 lg:static lg:mt-4 lg:rounded-xl lg:border">
        {inner}
      </div>
    );
  }

  return (
    <div className="mt-4 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 transition-all duration-200">
      <ShoppingCart size={16} className="text-slate-500" aria-hidden />
      {inner}
    </div>
  );
}
