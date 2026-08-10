import { Resend } from "resend";
import { writeAuditLog } from "@/lib/audit";
import { SystemModule, AuditAction } from "@prisma/client";

export interface ContactEmailPayload {
  to: string;
  businessName: string;
  providerId: string;
  productNames: string[];
  source: string;
  timestampIso: string;
  userId?: string;
  ipAddress?: string;
}

function buildContactHtml(payload: ContactEmailPayload): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:8080";
  const panelUrl = `${appUrl.replace(/\/$/, "")}/proveedor`;
  const products =
    payload.productNames.length > 0
      ? `<ul>${payload.productNames.map((n) => `<li>${escapeHtml(n)}</li>`).join("")}</ul>`
      : "<p>Ninguno especificado</p>";

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><title>Contacto — La Borrega Market</title></head>
<body style="font-family:Segoe UI,Arial,sans-serif;line-height:1.5;color:#1a1a1a;max-width:560px;margin:0 auto;padding:24px;">
  <h1 style="font-size:20px;margin:0 0 16px;">Nuevo intento de contacto</h1>
  <p>Hola, alguien quiere contactar a <strong>${escapeHtml(payload.businessName)}</strong>.</p>
  <p><strong>Fecha:</strong> ${escapeHtml(payload.timestampIso)}</p>
  <p><strong>Origen:</strong> ${escapeHtml(payload.source)}</p>
  <p><strong>Productos vistos:</strong></p>
  ${products}
  <p style="margin-top:24px;">
    <a href="${escapeHtml(panelUrl)}" style="display:inline-block;background:#166534;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px;">
      Abrir panel de proveedor
    </a>
  </p>
  <p style="font-size:12px;color:#666;margin-top:32px;">La Borrega Market — notificación automática</p>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Envía email de contacto vía Resend (≤3 intentos).
 * Sin RESEND_API_KEY: no-op + reason email_disabled.
 * No incluye PII del cliente.
 */
export async function sendContactNotification(
  payload: ContactEmailPayload
): Promise<{ ok: boolean; reason?: "email_disabled" | "send_failed" | "no_email" }> {
  if (!payload.to?.trim()) {
    return { ok: false, reason: "no_email" };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    return { ok: false, reason: "email_disabled" };
  }

  const resend = new Resend(apiKey);
  const html = buildContactHtml(payload);
  const subject = `Contacto — ${payload.businessName}`;
  const delays = [0, 1000, 2000];

  for (let attempt = 0; attempt < delays.length; attempt++) {
    if (delays[attempt] > 0) await sleep(delays[attempt]);
    try {
      const result = await resend.emails.send({
        from,
        to: payload.to,
        subject,
        html,
      });
      if (result.error) {
        continue;
      }
      return { ok: true };
    } catch {
      // retry
    }
  }

  return { ok: false, reason: "send_failed" };
}

export async function recordContactNotificationFailure(params: {
  providerId: string;
  source: string;
  productIds: string[];
  productNames: string[];
  reason: "email_disabled" | "send_failed" | "no_email";
  userId?: string;
  ipAddress?: string;
}) {
  await writeAuditLog({
    module: SystemModule.PROVIDERS,
    action: AuditAction.CONTACT,
    entityId: params.providerId,
    userId: params.userId,
    ipAddress: params.ipAddress,
    details: {
      source: params.source,
      productIds: params.productIds,
      productNames: params.productNames,
      rateLimited: false,
      notificationFailed: true,
      reason: params.reason,
    },
  });
}
