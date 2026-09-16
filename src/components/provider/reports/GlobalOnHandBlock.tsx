"use client";

import type { GlobalInventoryReport } from "@/lib/api/types";

export function GlobalOnHandBlock({
  report,
  loading,
  error,
  onRetry,
}: {
  report: GlobalInventoryReport | null;
  loading: boolean;
  error: string;
  onRetry: () => void;
}) {
  if (loading) {
    return <div className="mt-6 h-32 animate-pulse rounded-xl bg-slate-100" aria-busy />;
  }
  if (error) {
    return (
      <div className="mt-6">
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
        <button
          type="button"
          className="mt-2 min-h-11 rounded-lg border border-gray-300 px-4 text-sm"
          onClick={onRetry}
        >
          Reintentar
        </button>
      </div>
    );
  }
  const empty =
    !report ||
    report.byProvider.every((p) => p.balances.length === 0);
  return (
    <section className="mt-8 rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-slate-900">Inventario actual</h2>
      <p className="mt-1 text-sm text-slate-600">
        Saldos ahora. El historial de entradas está en Reportes de cada sucursal.
      </p>
      {empty ? (
        <p className="mt-4 text-sm text-slate-600">No hay existencias registradas.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">Sucursal</th>
                <th>SKU</th>
                <th>On-hand</th>
              </tr>
            </thead>
            <tbody>
              {report!.byProvider.flatMap((branch) =>
                branch.balances.map((row) => (
                  <tr key={`${branch.providerId}-${row.providerProductId}`} className="border-t border-gray-100">
                    <td className="py-2">{branch.businessName}</td>
                    <td>{row.name}</td>
                    <td>
                      {row.onHand} {row.effectiveSaleUnit}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
