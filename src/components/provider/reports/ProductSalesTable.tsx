"use client";

import type { ProviderReport } from "@/lib/api/types";
import { formatCurrency, formatQty } from "@/lib/format";
import { QuickSaleBadge } from "@/components/ui/QuickSaleBadge";

export function ProductSalesTable({ products }: { products: NonNullable<ProviderReport["products"]> }) {
  if (products.length === 0) {
    return (
      <p className="text-sm text-slate-600" role="status">
        Sin ventas en este corte
      </p>
    );
  }

  return (
    <>
      <ul className="space-y-3 md:hidden">
        {products.map((p, i) => (
          <li
            key={`${p.providerProductId ?? "qs"}-${i}`}
            className="rounded-lg border border-gray-100 p-3 text-sm"
          >
            <p className="font-medium">
              {p.providerProductId ? p.name : <QuickSaleBadge />}
              {!p.providerProductId && <span className="ml-2">{p.name}</span>}
            </p>
            <p className="mt-1 tabular-nums text-slate-600">
              {formatQty(p.quantitySum)} · {formatCurrency(p.salesTotal)}
            </p>
          </li>
        ))}
      </ul>
      <table className="hidden w-full text-left text-sm md:table">
        <thead>
          <tr className="border-b border-gray-200 text-slate-600">
            <th className="py-2 font-medium">Producto</th>
            <th className="py-2 font-medium">Cantidad</th>
            <th className="py-2 font-medium">Ingreso</th>
            <th className="py-2 font-medium">App</th>
            <th className="py-2 font-medium">Mostrador</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p, i) => (
            <tr key={`${p.providerProductId ?? "qs"}-${i}`} className="border-b border-gray-100">
              <td className="py-2">
                {p.providerProductId ? p.name : <QuickSaleBadge />}
                {!p.providerProductId && <span className="ml-2">{p.name}</span>}
              </td>
              <td className="py-2 tabular-nums">{formatQty(p.quantitySum)}</td>
              <td className="py-2 tabular-nums">{formatCurrency(p.salesTotal)}</td>
              <td className="py-2 tabular-nums">{formatCurrency(p.bySource.MARKETPLACE.gmv)}</td>
              <td className="py-2 tabular-nums">{formatCurrency(p.bySource.POS.gmv)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
