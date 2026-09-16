"use client";

import { Button } from "@/components/ui/Button";
import type { AdminProduct } from "@/lib/api/types";
import { ScopeBadge } from "@/components/provider/catalog/ScopeBadge";

export function AdminProductTableF13({
  products,
  selectedId,
  onSelect,
  onToggleActive,
}: {
  products: AdminProduct[];
  selectedId: string | null;
  onSelect: (product: AdminProduct) => void;
  onToggleActive: (product: AdminProduct) => void;
}) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Origen</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Dueño</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.map((p) => (
              <tr
                key={p.id}
                className={selectedId === p.id ? "bg-orange-50" : "hover:bg-slate-50"}
              >
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="min-h-11 text-left font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                    onClick={() => onSelect(p)}
                  >
                    {p.name}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <ScopeBadge scope={p.scope} />
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.isActive ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {p.isActive ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {p.scope === "GLOBAL" ? "Plataforma" : p.ownerBusinessName || "Sucursal"}
                </td>
                <td className="px-4 py-3">
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-11"
                    onClick={() => onToggleActive(p)}
                  >
                    {p.isActive ? "Inhabilitar" : "Reactivar"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="divide-y divide-gray-100 md:hidden">
        {products.map((p) => (
          <li key={p.id} className="space-y-2 px-4 py-3">
            <button
              type="button"
              className="min-h-11 w-full text-left"
              onClick={() => onSelect(p)}
            >
              <p className="font-medium">{p.name}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <ScopeBadge scope={p.scope} />
                <span className="text-xs text-slate-600">
                  {p.isActive ? "Activo" : "Inactivo"}
                </span>
                <span className="text-xs text-slate-500">
                  {p.scope === "GLOBAL" ? "Plataforma" : p.ownerBusinessName || "Sucursal"}
                </span>
              </div>
            </button>
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 w-full"
              onClick={() => onToggleActive(p)}
            >
              {p.isActive ? "Inhabilitar" : "Reactivar"}
            </Button>
          </li>
        ))}
      </ul>
    </>
  );
}
