export const UserRole = {
  CLIENT: "CLIENT",
  PROVIDER: "PROVIDER",
  ADMIN: "ADMIN",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const SystemModule = {
  USERS: "USERS",
  PROVIDERS: "PROVIDERS",
  PRODUCTS: "PRODUCTS",
  ORDERS: "ORDERS",
  PERMISSIONS: "PERMISSIONS",
  AUTH: "AUTH",
  AUDIT: "AUDIT",
} as const;

export type SystemModule = (typeof SystemModule)[keyof typeof SystemModule];

/** Rutas de catálogos y permisos — solo ADMIN */
export const ADMIN_ONLY_PREFIXES = [
  "/admin",
  "/api/admin",
  "/api/catalogs",
  "/api/permissions",
  "/api/audit",
];

/** Rutas del panel de proveedor */
export const PROVIDER_PREFIXES = ["/proveedor", "/api/provider"];

/** Rutas del cliente autenticado */
export const CLIENT_PREFIXES = ["/cuenta", "/api/orders"];

export async function hasModulePermission(
  role: UserRole,
  module: SystemModule,
  action: "view" | "create" | "edit" | "delete"
): Promise<boolean> {
  const prisma = (await import("@/lib/prisma")).default;

  const mod = await prisma.module.findUnique({ where: { code: module } });
  if (!mod) return false;

  const perm = await prisma.rolePermission.findUnique({
    where: { role_moduleId: { role, moduleId: mod.id } },
  });
  if (!perm) return false;

  switch (action) {
    case "view":
      return perm.canView;
    case "create":
      return perm.canCreate;
    case "edit":
      return perm.canEdit;
    case "delete":
      return perm.canDelete;
  }
}

export function isAdminRoute(pathname: string): boolean {
  return ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p));
}

export function isProviderRoute(pathname: string): boolean {
  return PROVIDER_PREFIXES.some((p) => pathname.startsWith(p));
}

export function isClientRoute(pathname: string): boolean {
  return CLIENT_PREFIXES.some((p) => pathname.startsWith(p));
}
