"use client";

import { Smartphone, Store } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { ProviderReportSourceKpi } from "@/lib/api/types";

export function ReportOriginSplit({
  marketplace,
  pos,
}: {
  marketplace: ProviderReportSourceKpi;
  pos: ProviderReportSourceKpi;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-sm text-slate-500">Encargar / Mostrador</p>
      <p className="mt-1 text-[1.875rem] font-semibold tabular-nums leading-tight">
        {marketplace.orderCount} / {pos.orderCount}
      </p>
      <ul className="mt-3 space-y-2 text-sm">
        <li className="flex items-center gap-2">
          <Smartphone size={16} aria-hidden className="text-slate-600" />
          <span>Encargar (pedido en línea)</span>
          <span className="ml-auto tabular-nums font-medium">
            {formatCurrency(marketplace.gmv)} · {marketplace.orderCount}
          </span>
        </li>
        <li className="flex items-center gap-2">
          <Store size={16} aria-hidden className="text-slate-600" />
          <span>Mostrador (POS)</span>
          <span className="ml-auto tabular-nums font-medium">
            {formatCurrency(pos.gmv)} · {pos.orderCount}
          </span>
        </li>
      </ul>
      <table className="sr-only">
        <caption>Origen de ventas</caption>
        <thead>
          <tr>
            <th>Origen</th>
            <th>GMV</th>
            <th>Órdenes</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Encargar</td>
            <td>{marketplace.gmv}</td>
            <td>{marketplace.orderCount}</td>
          </tr>
          <tr>
            <td>Mostrador</td>
            <td>{pos.gmv}</td>
            <td>{pos.orderCount}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
