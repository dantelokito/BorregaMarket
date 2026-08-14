import { SystemModule } from "@prisma/client";
import prisma from "@/lib/prisma";

/** Catálogos expuestos en GET /api/catalogs (incluye aliases API-ADMIN-01) */
export const AVAILABLE_CATALOGS = [
  "users",
  "providers",
  "products",
  "provider-products",
  "orders",
  "modules",
  "role-permissions",
  "permissions",
  "audit",
] as const;

export type CatalogName = (typeof AVAILABLE_CATALOGS)[number];

/** Aliases documentados en API-ADMIN-01 → nombre interno */
const CATALOG_ALIASES: Record<string, string> = {
  "role-permissions": "permissions",
};

/** Módulo RBAC requerido para ver cada catálogo (OBS-004) */
const CATALOG_MODULE: Record<string, SystemModule> = {
  users: SystemModule.USERS,
  providers: SystemModule.PROVIDERS,
  products: SystemModule.PRODUCTS,
  "provider-products": SystemModule.PRODUCTS,
  orders: SystemModule.ORDERS,
  permissions: SystemModule.PERMISSIONS,
  audit: SystemModule.AUDIT,
  modules: SystemModule.PERMISSIONS,
};

export function normalizeCatalogName(catalog: string): string | null {
  const normalized = CATALOG_ALIASES[catalog] ?? catalog;
  if (!AVAILABLE_CATALOGS.includes(normalized as CatalogName)) {
    return null;
  }
  return normalized;
}

export function getCatalogModule(catalog: string): SystemModule | null {
  const normalized = normalizeCatalogName(catalog);
  if (!normalized) return null;
  return CATALOG_MODULE[normalized] ?? null;
}

export async function fetchCatalogData(catalog: string): Promise<unknown> {
  const normalized = normalizeCatalogName(catalog);
  if (!normalized) {
    throw new CatalogNotFoundError();
  }

  switch (normalized) {
    case "users":
      return prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });

    case "providers":
      return prisma.provider.findMany({
        include: { user: { select: { email: true, name: true } } },
        orderBy: { createdAt: "desc" },
      });

    case "products":
      return prisma.product.findMany({ orderBy: { name: "asc" } });

    case "provider-products":
      return prisma.providerProduct.findMany({
        include: {
          provider: { select: { businessName: true } },
          product: { select: { name: true, category: true, unit: true } },
        },
        orderBy: [{ provider: { businessName: "asc" } }, { product: { name: "asc" } }],
      });

    case "orders":
      return prisma.order.findMany({
        include: {
          client: { select: { name: true, email: true } },
          provider: { select: { businessName: true } },
          items: { include: { product: { select: { name: true } } } },
        },
        orderBy: { createdAt: "desc" },
      });

    case "permissions":
      return prisma.rolePermission.findMany({
        include: { module: true },
        orderBy: [{ role: "asc" }, { module: { name: "asc" } }],
      });

    case "audit":
      return prisma.auditLog.findMany({
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 100,
      });

    case "modules":
      return prisma.module.findMany({ orderBy: { name: "asc" } });

    default:
      throw new CatalogNotFoundError();
  }
}

export class CatalogNotFoundError extends Error {
  constructor(message = "Catálogo inválido") {
    super(message);
    this.name = "CatalogNotFoundError";
  }
}
