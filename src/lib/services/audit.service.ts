import { Prisma, SystemModule, AuditAction } from "@prisma/client";
import prisma from "@/lib/prisma";
import { buildMeta } from "@/lib/services/pagination";

interface AuditFilters {
  module?: SystemModule;
  action?: AuditAction;
  userId?: string;
}

interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export async function listAuditLogs(
  filters: AuditFilters,
  pagination: PaginationParams
) {
  const where: Prisma.AuditLogWhereInput = {
    ...(filters.module ? { module: filters.module } : {}),
    ...(filters.action ? { action: filters.action } : {}),
    ...(filters.userId ? { userId: filters.userId } : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    data: logs.map((log) => ({
      id: log.id,
      module: log.module,
      action: log.action,
      entityId: log.entityId,
      userId: log.userId,
      userName: log.user?.name ?? null,
      userEmail: log.user?.email ?? null,
      details: log.details,
      ipAddress: log.ipAddress,
      createdAt: log.createdAt.toISOString(),
    })),
    meta: buildMeta(pagination.page, pagination.limit, total),
  };
}
