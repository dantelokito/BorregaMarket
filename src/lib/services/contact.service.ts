import { SystemModule, AuditAction } from "@prisma/client";
import prisma from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import {
  checkContactRateLimit,
  ContactRedisUnavailableError,
} from "@/lib/rate-limit/contact";
import { inngest } from "@/lib/inngest/client";
import type { ContactBodyInput } from "@/lib/validators/contact";
import { ProviderNotFoundError } from "@/lib/services/provider.service";

export { ContactRedisUnavailableError };

export class ContactRateLimitError extends Error {
  constructor(message = "Demasiados intentos. Intenta más tarde.") {
    super(message);
    this.name = "ContactRateLimitError";
  }
}

export interface ContactResult {
  notified: true;
  message: string;
}

/**
 * Registra CONTACT sync + encola email vía Inngest (ADR-015).
 */
export async function registerContact(
  providerId: string,
  body: ContactBodyInput,
  opts: {
    ipAddress?: string;
    userId?: string;
    sessionId?: string | null;
  }
): Promise<ContactResult> {
  const provider = await prisma.provider.findFirst({
    where: { id: providerId, isActive: true },
    include: { user: { select: { email: true } } },
  });

  if (!provider) {
    throw new ProviderNotFoundError("Frutería no encontrada");
  }

  const ip = opts.ipAddress ?? "unknown";
  const allowed = await checkContactRateLimit({
    providerId,
    ip,
    sessionId: opts.sessionId ?? opts.userId ?? null,
  });

  if (!allowed) {
    await writeAuditLog({
      module: SystemModule.PROVIDERS,
      action: AuditAction.CONTACT,
      entityId: provider.id,
      userId: opts.userId,
      ipAddress: ip,
      details: {
        source: body.source,
        productIds: body.productIds,
        productNames: [],
        rateLimited: true,
        notificationFailed: false,
        reason: "rate_limited",
      },
    });
    throw new ContactRateLimitError();
  }

  const productIds = body.productIds.slice(0, 10);
  let productNames: string[] = [];
  if (productIds.length > 0) {
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });
    const byId = new Map(products.map((p) => [p.id, p.name]));
    productNames = productIds
      .map((id) => byId.get(id))
      .filter((n): n is string => Boolean(n));
  }

  const timestampIso = new Date().toISOString();
  const ownerEmail = provider.user.email?.trim() ?? "";
  const hasValidOwnerEmail = isValidEmail(ownerEmail);

  const auditId = await writeAuditLog({
    module: SystemModule.PROVIDERS,
    action: AuditAction.CONTACT,
    entityId: provider.id,
    userId: opts.userId,
    ipAddress: ip,
    details: {
      source: body.source,
      productIds,
      productNames,
      rateLimited: false,
      notificationFailed: !hasValidOwnerEmail,
      reason: hasValidOwnerEmail ? null : "no_email",
    },
  });

  if (hasValidOwnerEmail) {
    try {
      await inngest.send({
        name: "notify/contact.requested",
        data: {
          auditId,
          providerId: provider.id,
          productIds,
          productNames,
          source: body.source,
          timestampIso,
          userId: opts.userId,
          ipAddress: ip,
          to: ownerEmail,
          businessName: provider.businessName,
        },
      });
    } catch {
      await writeAuditLog({
        module: SystemModule.PROVIDERS,
        action: AuditAction.CONTACT,
        entityId: provider.id,
        userId: opts.userId,
        ipAddress: ip,
        details: {
          source: body.source,
          productIds,
          productNames,
          rateLimited: false,
          notificationFailed: true,
          reason: "inngest_send_failed",
        },
      });
    }
  }

  return {
    notified: true,
    message: "Frutería notificada",
  };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
