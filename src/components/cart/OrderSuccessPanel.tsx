import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import type { Order } from "@/lib/api/types";
import { OrderStatusBadge } from "@/components/ui/OrderStatusBadge";
import { Button } from "@/components/ui/Button";
import { shortOrderId } from "@/lib/orders/labels";
import { formatCurrency } from "@/lib/format";

export function OrderSuccessPanel({ order }: { order: Order }) {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
      <CheckCircle2 size={48} className="mx-auto text-emerald-500" aria-hidden />
      <h2 className="mt-4 text-2xl font-semibold">Pedido #{shortOrderId(order.id)} enviado</h2>
      <p className="mt-2 text-sm text-slate-500">La frutería confirmará tu encargo</p>
      <div className="mt-3 flex justify-center">
        <OrderStatusBadge status={order.status} />
      </div>
      <p className="mt-4 text-sm font-medium tabular-nums">{formatCurrency(order.total)}</p>
      <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link href="/cuenta">
          <Button className="w-full py-3 sm:w-auto">Ver mis pedidos</Button>
        </Link>
        <Link href="/explorar">
          <Button variant="secondary" className="w-full py-3 sm:w-auto">
            Seguir explorando
          </Button>
        </Link>
      </div>
    </div>
  );
}
