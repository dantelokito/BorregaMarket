"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import {
  Users,
  Store,
  Package,
  ShoppingCart,
  Shield,
  ScrollText,
  LayoutGrid,
} from "lucide-react";

const CATALOGS = [
  { id: "users", label: "Usuarios", icon: Users, color: "bg-blue-100 text-blue-700" },
  { id: "providers", label: "Proveedores", icon: Store, color: "bg-green-100 text-green-700" },
  { id: "products", label: "Productos", icon: Package, color: "bg-orange-100 text-orange-700" },
  { id: "orders", label: "Pedidos", icon: ShoppingCart, color: "bg-purple-100 text-purple-700" },
  { id: "permissions", label: "Permisos", icon: Shield, color: "bg-red-100 text-red-700" },
  { id: "audit", label: "Bitácora", icon: ScrollText, color: "bg-gray-100 text-gray-700" },
  { id: "modules", label: "Módulos", icon: LayoutGrid, color: "bg-yellow-100 text-yellow-700" },
];

export default function AdminPage() {
  const [activeCatalog, setActiveCatalog] = useState<string | null>(null);
  const [data, setData] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeCatalog) return;
    setLoading(true);
    fetch(`/api/catalogs?catalog=${activeCatalog}`)
      .then((r) => r.json())
      .then((d) => setData(d.data ?? []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [activeCatalog]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Panel Administrador</h1>
            <p className="text-gray-500 text-sm">
              Acceso exclusivo a catálogos, permisos y bitácora del sistema
            </p>
          </div>
          <Link href="/explorar" className="text-sm text-[var(--brand)] hover:underline">
            ← Volver al explorador
          </Link>
        </div>

        {/* Catalog grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {CATALOGS.map((cat) => {
            const Icon = cat.icon;
            const active = activeCatalog === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCatalog(cat.id)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  active
                    ? "border-[var(--brand)] ring-2 ring-[var(--brand)]/20 bg-white shadow-sm"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className={`inline-flex p-2 rounded-lg mb-2 ${cat.color}`}>
                  <Icon size={20} />
                </div>
                <p className="font-medium text-sm">{cat.label}</p>
              </button>
            );
          })}
        </div>

        {/* Data table */}
        {activeCatalog && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold capitalize">{activeCatalog}</h2>
              <span className="text-sm text-gray-500">{data.length} registros</span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-gray-500">Cargando catálogo...</div>
            ) : data.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>Sin datos — conecta PostgreSQL y ejecuta el seed.</p>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded mt-2 inline-block">
                  npm run db:seed
                </code>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <pre className="p-4 text-xs text-gray-700 max-h-96 overflow-auto">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
