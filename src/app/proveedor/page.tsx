"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { ToggleLeft, ToggleRight } from "lucide-react";

interface CatalogItem {
  product: {
    id: string;
    name: string;
    category: string;
    unit: string;
  };
  price: number | null;
  isAvailable: boolean;
  providerProductId: string | null;
}

export default function ProviderPage() {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/provider/products")
      .then((r) => r.json())
      .then((d) => {
        setCatalog(d.catalog ?? []);
        setBusinessName(d.provider?.businessName ?? "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function toggleProduct(productId: string, current: boolean, price: number | null) {
    const res = await fetch("/api/provider/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId,
        isAvailable: !current,
        price: price ?? 50,
      }),
    });

    if (res.ok) {
      setCatalog((prev) =>
        prev.map((item) =>
          item.product.id === productId ? { ...item, isAvailable: !current } : item
        )
      );
    }
  }

  const categories = ["FRUTA", "VERDURA", "AGRICOLA"] as const;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Panel Proveedor</h1>
            <p className="text-gray-500 text-sm">
              {businessName || "Tu frutería"} — Activa o desactiva productos del catálogo global
            </p>
          </div>
          <Link href="/explorar" className="text-sm text-[var(--brand)] hover:underline">
            ← Ver explorador
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Cargando catálogo...</div>
        ) : catalog.length === 0 ? (
          <div className="bg-white rounded-xl border p-8 text-center text-gray-500">
            <p>Conecta la base de datos para gestionar productos.</p>
          </div>
        ) : (
          categories.map((cat) => {
            const items = catalog.filter((c) => c.product.category === cat);
            if (items.length === 0) return null;

            const catLabels = { FRUTA: "🍎 Frutas", VERDURA: "🥬 Verduras", AGRICOLA: "🌾 Agrícola" };

            return (
              <div key={cat} className="mb-8">
                <h2 className="font-semibold text-lg mb-4">{catLabels[cat]}</h2>
                <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                  {items.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex items-center justify-between px-5 py-4"
                    >
                      <div>
                        <p className="font-medium">{item.product.name}</p>
                        <p className="text-sm text-gray-500">
                          {item.price
                            ? `$${item.price.toLocaleString("es-MX")} / ${item.product.unit}`
                            : "Sin precio asignado"}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          toggleProduct(item.product.id, item.isAvailable, item.price)
                        }
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          item.isAvailable
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {item.isAvailable ? (
                          <>
                            <ToggleRight size={18} /> Activo
                          </>
                        ) : (
                          <>
                            <ToggleLeft size={18} /> Inactivo
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
