"use client";

import { useCallback, useEffect, useState } from "react";
import { getBranchInventoryReport } from "@/lib/api/provider-f13";
import { ApiError } from "@/lib/api/client";
import type { BranchInventoryReport } from "@/lib/api/types";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { DocumentActions } from "./DocumentActions";
import { formatHistoryWhen } from "@/lib/catalog/f13";

export function InventoryReportsPanel() {
  const [data, setData] = useState<BranchInventoryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: report } = await getBranchInventoryReport({ limit: 50 });
      setData(report);
    } catch (err) {
      setData(null);
      setError(err instanceof ApiError ? err.message : "No se pudo cargar el inventario");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <div className="no-print mb-4 flex justify-end">
        <DocumentActions onPrint={() => window.print()} showPdf={false} disabled={!data} />
      </div>
      {error ? <ErrorBanner message={error} onRetry={() => void load()} /> : null}
      {loading ? (
        <div className="space-y-4" aria-busy>
          <div className="h-32 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-32 animate-pulse rounded-xl bg-slate-100" />
        </div>
      ) : data ? (
        <div id="report-print-inv-f13">
          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="mb-3 text-lg font-semibold">Inventario actual (sucursal activa)</h3>
            {data.balances.length === 0 ? (
              <p className="text-sm text-slate-600">Sin SKUs visibles (los ocultos no se listan).</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500">
                    <tr>
                      <th className="py-2">SKU</th>
                      <th>Unidad oferta</th>
                      <th>On-hand</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.balances.map((row) => (
                      <tr key={row.providerProductId} className="border-t border-gray-100">
                        <td className="py-2">{row.name}</td>
                        <td>{row.effectiveSaleUnit}</td>
                        <td>{row.onHand}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <section className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="mb-3 text-lg font-semibold">Entradas / cargas</h3>
            {data.entries.length === 0 ? (
              <p className="text-sm text-slate-600">Aún no hay entradas registradas.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500">
                    <tr>
                      <th className="py-2">Fecha</th>
                      <th>SKU</th>
                      <th>Cant.</th>
                      <th>Caja?</th>
                      <th>Delta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.entries.map((row) => (
                      <tr key={row.id} className="border-t border-gray-100">
                        <td className="py-2">{formatHistoryWhen(row.createdAt)}</td>
                        <td>{row.name}</td>
                        <td>{row.quantity}</td>
                        <td>{row.receiveAs === "BOX" ? "Sí" : "No"}</td>
                        <td>{row.appliedDelta}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
