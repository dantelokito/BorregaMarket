import { NextRequest } from "next/server";
import { SystemModule, UserRole } from "@prisma/client";
import { getSession, requireRole, AuthError } from "@/lib/auth/session";
import { hasModulePermission } from "@/lib/auth/permissions";

export type ModuleAction = "view" | "create" | "edit" | "delete";

/** Dual RBAC: JWT ADMIN + permiso de módulo. 401 / 403. */
export async function requireAdminModule(
  request: NextRequest,
  module: SystemModule,
  action: ModuleAction
) {
  const session = requireRole(getSession(request), UserRole.ADMIN);
  const allowed = await hasModulePermission(session.role, module, action);
  if (!allowed) {
    throw new AuthError("Sin permiso para este módulo", 403);
  }
  return session;
}
