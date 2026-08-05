import type { UserRole, SystemModule } from "@prisma/client";

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
