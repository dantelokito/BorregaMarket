import { SystemModule, AuditAction } from "@prisma/client";
import prisma from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { checkContactRateLimit } from "@/lib/rate-limit/contact";
import {
  sendContactNotification,
  recordContactNotificationFailure,
} from "@/lib/email/resend";
import type { ContactBodyInput } from "@/lib/validators/contact";
import { ProviderNotFoundError } from "@/lib/services/provider.service";

export class ContactRateLimitError extends Error {
  constructor(message = "Demasiados intentos. Intenta más tarde.") {
    super(message);
    this.name = "ContactRateLimitError";
  }
}

export interface ContactResult {
  notified: true;
  message: string;
  /** Payload para schedule async vía after() en el route */
  emailJob: {
    to: string;
    businessName: string;
    providerId: string;
    productIds: string[];
    productNames: string[];
    source: string;
    timestampIso: string;
    userId?: string;
    ipAddress?: string;
  } | null;
}

/**
 * Registra CONTACT sync + prepara email async.
 * El route debe invocar after() con runContactEmailJob(emailJob).
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
  const allowed = checkContactRateLimit({
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
      notificationFailed: false,
      reason: null,
    },
  });

  return {
    notified: true,
    message: "Frutería notificada",
    emailJob: {
      to: ownerEmail,
      businessName: provider.businessName,
      providerId: provider.id,
      productIds,
      productNames,
      source: body.source,
      timestampIso,
      userId: opts.userId,
      ipAddress: ip,
    },
  };
}

export async function runContactEmailJob(
  job: NonNullable<ContactResult["emailJob"]>
): Promise<void> {
  const result = await sendContactNotification({
    to: job.to,
    businessName: job.businessName,
    providerId: job.providerId,
    productNames: job.productNames,
    source: job.source,
    timestampIso: job.timestampIso,
    userId: job.userId,
    ipAddress: job.ipAddress,
  });

  if (!result.ok && result.reason) {
    await recordContactNotificationFailure({
      providerId: job.providerId,
      source: job.source,
      productIds: job.productIds,
      productNames: job.productNames,
      reason: result.reason,
      userId: job.userId,
      ipAddress: job.ipAddress,
    });
  }
}
