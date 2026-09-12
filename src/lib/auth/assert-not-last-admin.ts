import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";

export class LastAdminError extends Error {
  constructor(
    public field: "role" | "isActive",
    message = "Debe existir al menos un administrador activo"
  ) {
    super(message);
    this.name = "LastAdminError";
  }

  details() {
    return [
      {
        field: this.field,
        message: "No se puede quitar el último administrador",
      },
    ];
  }
}

/**
 * Invariante ADR-031: siempre ≥ 1 ADMIN activo.
 * Llamar antes de persistir un cambio de role o isActive sobre un ADMIN.
 */
export async function assertNotLastAdmin(params: {
  userId: string;
  nextRole?: UserRole;
  nextIsActive?: boolean;
}): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true, role: true, isActive: true },
  });
  if (!user) return;
  if (user.role !== UserRole.ADMIN || !user.isActive) return;

  const wouldDemoteRole =
    params.nextRole !== undefined && params.nextRole !== UserRole.ADMIN;
  const wouldDeactivate = params.nextIsActive === false;
  if (!wouldDemoteRole && !wouldDeactivate) return;

  const remaining = await prisma.user.count({
    where: {
      role: UserRole.ADMIN,
      isActive: true,
      id: { not: params.userId },
    },
  });
  if (remaining === 0) {
    throw new LastAdminError(wouldDemoteRole ? "role" : "isActive");
  }
}
