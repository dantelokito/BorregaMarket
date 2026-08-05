import { SystemModule, AuditAction } from "@prisma/client";
import prisma from "@/lib/prisma";

interface AuditEntry {
  module: SystemModule;
  action: AuditAction;
  entityId?: string;
  userId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  await prisma.auditLog.create({
    data: {
      module: entry.module,
      action: entry.action,
      entityId: entry.entityId,
      userId: entry.userId,
      details: entry.details ?? undefined,
      ipAddress: entry.ipAddress,
    },
  });
}
