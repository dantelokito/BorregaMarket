import { Smartphone, Store } from "lucide-react";
import type { OrderSource } from "@/lib/api/types";
import { ORDER_SOURCE_LABEL } from "@/lib/orders/labels";

export function OriginBadge({ source }: { source: OrderSource }) {
  const Icon = source === "POS" ? Store : Smartphone;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
      <Icon size={12} aria-hidden />
      {ORDER_SOURCE_LABEL[source]}
    </span>
  );
}
