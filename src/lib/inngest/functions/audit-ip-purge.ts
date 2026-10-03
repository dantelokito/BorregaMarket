import { inngest } from "@/lib/inngest/client";
import prisma from "@/lib/prisma";

export const AUDIT_IP_RETENTION_DAYS = 365;

/** ADR-042: anonimiza (no borra) la IP de AuditLog con más de 12 meses. */
export async function purgeAuditIps(now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - AUDIT_IP_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const result = await prisma.auditLog.updateMany({
    where: { createdAt: { lt: cutoff }, ipAddress: { not: null } },
    data: { ipAddress: null },
  });
  return result.count;
}

export const auditIpPurge = inngest.createFunction(
  {
    id: "audit-ip-purge",
    retries: 2,
    triggers: [{ cron: "0 9 * * *" }],
  },
  async () => {
    const purged = await purgeAuditIps();
    return { purged };
  }
);
