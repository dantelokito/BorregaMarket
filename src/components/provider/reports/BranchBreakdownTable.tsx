"use client";

import { formatCurrency } from "@/lib/format";
import type { GlobalReportByProvider } from "@/lib/api/types";

export function BranchBreakdownTable({
  rows,
  totalGmv,
  totalOrders,
  totalTicket,
}: {
  rows: GlobalReportByProvider[];
  totalGmv: string;
  totalOrders: number;
  totalTicket: string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full min-w-[560px] text-sm">
        <caption className="sr-only">Ventas por sucursal</caption>
        <thead className="border-b border-gray-200 bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-slate-900">Sucursal</th>
            <th className="px-4 py-3 text-right font-semibold text-slate-900">GMV</th>
            <th className="px-4 py-3 text-right font-semibold text-slate-900">Órdenes</th>
            <th className="px-4 py-3 text-right font-semibold text-slate-900">Ticket</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => (
            <tr key={row.providerId}>
              <td className="px-4 py-3 font-medium text-slate-900">{row.businessName}</td>
              <td className="px-4 py-3 text-right tabular-nums text-slate-900">
                {formatCurrency(row.gmv)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-slate-900">{row.orderCount}</td>
              <td className="px-4 py-3 text-right tabular-nums text-slate-900">
                {formatCurrency(row.avgTicket)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-gray-200 bg-gray-50 font-semibold">
            <td className="px-4 py-3 text-slate-900">Total</td>
            <td className="px-4 py-3 text-right tabular-nums text-slate-900">
              {formatCurrency(totalGmv)}
            </td>
            <td className="px-4 py-3 text-right tabular-nums text-slate-900">{totalOrders}</td>
            <td className="px-4 py-3 text-right tabular-nums text-slate-900">
              {formatCurrency(totalTicket)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
