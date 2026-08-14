import { SystemModule, AuditAction } from "@prisma/client";
import prisma from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import {
  updateClientProfileSchema,
  type UpdateClientProfileInput,
} from "@/lib/validators/user";

export class UserNotFoundError extends Error {
  constructor(message = "Usuario no encontrado") {
    super(message);
    this.name = "UserNotFoundError";
  }
}

function mapClientProfile(user: {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  whatsappOptIn: boolean;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    whatsappOptIn: user.whatsappOptIn,
  };
}

export async function getClientProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      whatsappOptIn: true,
    },
  });

  if (!user) {
    throw new UserNotFoundError();
  }

  return mapClientProfile(user);
}

export async function updateClientProfile(
  userId: string,
  data: UpdateClientProfileInput,
  ipAddress?: string
) {
  const parsed = updateClientProfileSchema.parse(data);

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(parsed.name !== undefined ? { name: parsed.name } : {}),
      ...(parsed.phone !== undefined ? { phone: parsed.phone } : {}),
      ...(parsed.whatsappOptIn !== undefined
        ? { whatsappOptIn: parsed.whatsappOptIn }
        : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      whatsappOptIn: true,
    },
  });

  await writeAuditLog({
    module: SystemModule.USERS,
    action: AuditAction.UPDATE,
    entityId: userId,
    userId,
    ipAddress,
    details: {
      name: parsed.name,
      phone: parsed.phone,
      whatsappOptIn: parsed.whatsappOptIn,
    },
  });

  return mapClientProfile(user);
}
