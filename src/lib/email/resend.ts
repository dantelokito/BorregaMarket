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

type EmailSendResult = {
  ok: boolean;
  reason?: "email_disabled" | "send_failed" | "no_email";
};

async function sendHtmlEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<EmailSendResult> {
  if (!params.to?.trim()) {
    return { ok: false, reason: "no_email" };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    return { ok: false, reason: "email_disabled" };
  }

  const resend = new Resend(apiKey);
  try {
    const result = await resend.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    if (result.error) {
      return { ok: false, reason: "send_failed" };
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: "send_failed" };
  }
}

/**
 * Envía email de contacto vía Resend (≤3 intentos).
 * Sin RESEND_API_KEY: no-op + reason email_disabled.
 * No incluye PII del cliente.
 */
export async function sendContactNotification(
  payload: ContactEmailPayload
): Promise<EmailSendResult> {
  return sendHtmlEmail({
    to: payload.to,
    subject: `Contacto — ${payload.businessName}`,
    html: buildContactHtml(payload),
  });
}

export interface NewOrderEmailPayload {
  to: string;
  businessName: string;
  clientName: string;
  clientPhone?: string | null;
  total: string;
  items: Array<{ itemName: string; quantity: string; unitOfMeasure: string }>;
  etaMinutes?: number | null;
  fulfillmentType?: "PICKUP" | "DELIVERY";
}

export function etaEstimateLine(etaMinutes: number | null | undefined): string | null {
  if (etaMinutes === null || etaMinutes === undefined) return null;
  return `Listo aprox. en ~${etaMinutes} min (estimación)`;
}

export function buildNewOrderHtml(payload: NewOrderEmailPayload): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:8080";
  const panelUrl = `${appUrl.replace(/\/$/, "")}/proveedor`;
  const lines = payload.items
    .map(
      (item) =>
        `<li>${escapeHtml(item.itemName)} — ${escapeHtml(item.quantity)} ${escapeHtml(item.unitOfMeasure)}</li>`
    )
    .join("");
  const phone = payload.clientPhone
    ? `<p><strong>Teléfono:</strong> ${escapeHtml(payload.clientPhone)}</p>`
    : "";
  const fulfillment =
    payload.fulfillmentType === "DELIVERY" ? "entrega a domicilio" : "recoger";
  const etaLine = etaEstimateLine(payload.etaMinutes);
  const etaHtml = etaLine
    ? `<p><strong>Tiempo estimado:</strong> ${escapeHtml(etaLine)}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><title>Nuevo pedido — La Borrega Market</title></head>
<body style="font-family:Segoe UI,Arial,sans-serif;line-height:1.5;color:#1a1a1a;max-width:560px;margin:0 auto;padding:24px;">
  <h1 style="font-size:20px;margin:0 0 16px;">Nuevo pedido</h1>
  <p>Hola, <strong>${escapeHtml(payload.businessName)}</strong> tiene un pedido nuevo para ${fulfillment}.</p>
  <p><strong>Cliente:</strong> ${escapeHtml(payload.clientName)}</p>
  ${phone}
  ${etaHtml}
  <p><strong>Total:</strong> $${escapeHtml(payload.total)}</p>
  <p><strong>Productos:</strong></p>
  <ul>${lines}</ul>
  <p style="margin-top:24px;">
    <a href="${escapeHtml(panelUrl)}" style="display:inline-block;background:#166534;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px;">
      Abrir panel de proveedor
    </a>
  </p>
  <p style="font-size:12px;color:#666;margin-top:32px;">La Borrega Market — notificación automática</p>
</body>
</html>`;
}

export async function sendNewOrderEmail(
  payload: NewOrderEmailPayload
): Promise<EmailSendResult> {
  return sendHtmlEmail({
    to: payload.to,
    subject: `Nuevo pedido — ${payload.businessName}`,
    html: buildNewOrderHtml(payload),
  });
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
