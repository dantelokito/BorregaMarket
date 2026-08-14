"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Store,
  Package,
  ShoppingCart,
  Shield,
  ScrollText,
  LayoutGrid,
  CheckCircle,
  XCircle,
  MailWarning,
} from "lucide-react";
import {
  getCatalog,
  getAdminProviders,
  updateProviderVerification,
  getAuditLog,
  uploadAdminProductImage,
} from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import type { AdminProvider, AuditLogEntry } from "@/lib/api/types";
import { SkeletonTable } from "@/components/ui/SkeletonCard";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { MediaUpload } from "@/components/ui/MediaUpload";

type AdminTab = "catalogs" | "providers" | "audit";

interface CatalogProduct {
  id: string;
  name: string;
  category: string;
  unit: string;
  imageUrl: string | null;
}

const CATALOGS = [
  { id: "users", label: "Usuarios", icon: Users, color: "bg-blue-100 text-blue-700" },
  { id: "providers", label: "Proveedores", icon: Store, color: "bg-green-100 text-green-700" },
  { id: "products", label: "Productos", icon: Package, color: "bg-orange-100 text-orange-700" },
  { id: "orders", label: "Pedidos", icon: ShoppingCart, color: "bg-purple-100 text-purple-700" },
  { id: "permissions", label: "Permisos", icon: Shield, color: "bg-red-100 text-red-700" },
  { id: "audit", label: "Bitácora", icon: ScrollText, color: "bg-gray-100 text-gray-700" },
  { id: "modules", label: "Módulos", icon: LayoutGrid, color: "bg-yellow-100 text-yellow-700" },
];

function isProductRow(row: unknown): row is CatalogProduct {
  return (
    typeof row === "object" &&
    row !== null &&
    "id" in row &&
    "name" in row &&
    typeof (row as CatalogProduct).id === "string"
  );
}

export function AdminPageClient() {
  const [tab, setTab] = useState<AdminTab>("catalogs");
  const [activeCatalog, setActiveCatalog] = useState<string | null>(null);
  const [catalogData, setCatalogData] = useState<unknown[]>([]);
  const [providers, setProviders] = useState<AdminProvider[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [auditContactOnly, setAuditContactOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (tab !== "catalogs" || !activeCatalog) return;
    setLoading(true);
    setError("");
    getCatalog(activeCatalog)
      .then(({ data }) => setCatalogData(Array.isArray(data) ? data : []))
      .catch((err) => {
        setCatalogData([]);
        if (err instanceof ApiError) setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [tab, activeCatalog]);

  useEffect(() => {
    if (tab !== "providers") return;
    setLoading(true);
    setError("");
    getAdminProviders({ limit: 50 })
      .then(({ data }) => setProviders(data))
      .catch((err) => {
        setProviders([]);
        if (err instanceof ApiError) setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [tab]);

  useEffect(() => {
    if (tab !== "audit") return;
    setLoading(true);
    setError("");
    getAuditLog({
      limit: 50,
      ...(auditContactOnly ? { module: "PROVIDERS", action: "CONTACT" } : {}),
    })
      .then(({ data }) => setAuditLog(data))
      .catch((err) => {
        setAuditLog([]);
        if (err instanceof ApiError) setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [tab, auditContactOnly]);

  async function toggleVerification(id: string, current: boolean) {
    try {
      const { data } = await updateProviderVerification(id, !current);
      setProviders((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isVerified: data.isVerified } : p))
      );
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
    }
  }

  function updateProductImageLocal(productId: string, url: string) {
    setCatalogData((prev) =>
      prev.map((row) =>
        isProductRow(row) && row.id === productId ? { ...row, imageUrl: url } : row
      )
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Panel Administrador</h1>
          <p className="text-sm text-gray-500">
            Acceso exclusivo a catálogos, proveedores y bitácora del sistema
          </p>
        </div>
        <Link href="/explorar" className="text-sm text-[var(--brand)] hover:underline">
          ← Volver al explorador
        </Link>
      </div>

      <div className="mb-6 flex gap-2 border-b border-gray-200">
        {(
          [
            { id: "catalogs", label: "Catálogos" },
            { id: "providers", label: "Proveedores" },
            { id: "audit", label: "Bitácora" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand)] ${
              tab === t.id
                ? "border-[var(--brand)] text-[var(--brand)]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
        <Link
          href="/admin/analytics"
          className="border-b-2 border-transparent px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          Analítica
        </Link>
      </div>

      {error && (
        <div className="mb-6">
          <ErrorBanner message={error} />
        </div>
      )}

      {tab === "catalogs" && (
        <>
          <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            {CATALOGS.map((cat) => {
              const Icon = cat.icon;
              const active = activeCatalog === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCatalog(cat.id)}
                  className={`rounded-xl border p-4 text-left transition-all focus:outline-none focus:ring-2 focus:ring-[var(--brand)] ${
                    active
                      ? "border-[var(--brand)] bg-white shadow-sm ring-2 ring-[var(--brand)]/20"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className={`mb-2 inline-flex rounded-lg p-2 ${cat.color}`}>
                    <Icon size={20} />
                  </div>
                  <p className="text-sm font-medium">{cat.label}</p>
                </button>
              );
            })}
          </div>

          {activeCatalog && (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                <h2 className="font-semibold capitalize">{activeCatalog}</h2>
                <span className="text-sm text-gray-500">{catalogData.length} registros</span>
              </div>
              {loading ? (
                <div className="p-8">
                  <SkeletonTable rows={5} />
                </div>
              ) : catalogData.length === 0 ? (
                <div className="p-8">
                  <EmptyState
                    title="Sin datos"
                    description="Conecta PostgreSQL y ejecuta el seed: npm run db:seed"
                  />
                </div>
              ) : activeCatalog === "products" ? (
                <div className="divide-y divide-gray-100">
                  {catalogData.filter(isProductRow).map((product) => (
                    <div
                      key={product.id}
                      className="flex flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-gray-500">
                          {product.category} · {product.unit}
                        </p>
                      </div>
                      <MediaUpload
                        label={`Imagen — ${product.name}`}
                        variant="product"
                        category={product.category}
                        currentUrl={product.imageUrl}
                        onUpload={async (file) => {
                          const { data } = await uploadAdminProductImage(product.id, file);
                          updateProductImageLocal(product.id, data.url);
                          return data.url;
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <pre className="max-h-96 overflow-auto p-4 text-xs text-gray-700">
                  {JSON.stringify(catalogData, null, 2)}
                </pre>
              )}
            </div>
          )}
        </>
      )}

      {tab === "providers" && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          {loading ? (
            <div className="p-8">
              <SkeletonTable rows={5} />
            </div>
          ) : providers.length === 0 ? (
            <div className="p-8">
              <EmptyState title="Sin proveedores" description="No hay proveedores registrados." />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Negocio</th>
                  <th className="px-4 py-3 text-left font-semibold">Ciudad</th>
                  <th className="px-4 py-3 text-left font-semibold">Email</th>
                  <th className="px-4 py-3 text-center font-semibold">Notificación</th>
                  <th className="px-4 py-3 text-center font-semibold">Verificado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {providers.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-medium">{p.businessName}</td>
                    <td className="px-4 py-3 text-gray-500">{p.city}</td>
                    <td className="px-4 py-3 text-gray-500">{p.userEmail || "—"}</td>
                    <td className="px-4 py-3 text-center">
                      {p.hasValidEmail === false ? (
                        <span className="inline-flex min-h-[44px] items-center gap-1 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-800">
                          <MailWarning size={14} aria-hidden />
                          Sin email válido
                        </span>
                      ) : (
                        <span className="text-xs text-green-700">OK</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleVerification(p.id, p.isVerified)}
                        aria-label={p.isVerified ? "Quitar verificación" : "Verificar proveedor"}
                        className={`inline-flex min-h-[44px] items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--brand)] ${
                          p.isVerified
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {p.isVerified ? (
                          <>
                            <CheckCircle size={14} /> Verificado
                          </>
                        ) : (
                          <>
                            <XCircle size={14} /> Pendiente
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "audit" && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 px-4 py-3">
            <label className="inline-flex min-h-[44px] items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={auditContactOnly}
                onChange={(e) => setAuditContactOnly(e.target.checked)}
                className="rounded border-gray-300"
              />
              Solo contactos (NOTIFY)
            </label>
          </div>
          {loading ? (
            <div className="p-8">
              <SkeletonTable rows={5} />
            </div>
          ) : auditLog.length === 0 ? (
            <div className="p-8">
              <EmptyState title="Sin registros" description="La bitácora está vacía." />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Fecha</th>
                  <th className="px-4 py-3 text-left font-semibold">Módulo</th>
                  <th className="px-4 py-3 text-left font-semibold">Acción</th>
                  <th className="px-4 py-3 text-left font-semibold">Entidad</th>
                  <th className="px-4 py-3 text-left font-semibold">Usuario</th>
                  <th className="px-4 py-3 text-left font-semibold">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {auditLog.map((entry) => {
                  const details = entry.details as Record<string, unknown> | null;
                  const notifyFail =
                    details &&
                    (details.notificationFailed === true || details.rate_limited === true);
                  return (
                    <tr key={entry.id}>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(entry.createdAt).toLocaleString("es-MX")}
                      </td>
                      <td className="px-4 py-3">{entry.module}</td>
                      <td className="px-4 py-3">{entry.action}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">
                        {entry.entityId ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {entry.userName ?? entry.userEmail ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {notifyFail ? (
                          <span className="text-amber-700">
                            Notificación fallida
                            {typeof details?.reason === "string" ? `: ${details.reason}` : ""}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
