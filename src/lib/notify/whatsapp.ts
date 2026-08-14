import { toE164 } from "@/lib/phone";
import { etaEstimateLine } from "@/lib/email/resend";
import { inTransitLabel } from "@/lib/orders/labels";

export type WhatsAppSendResult = {
  ok: boolean;
  reason?: "wa_disabled" | "invalid_phone" | "send_failed" | "no_template";
};

function config() {
  const token = process.env.WHATSAPP_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const templateNew = process.env.WHATSAPP_TEMPLATE_ORDER_NEW?.trim();
  const templateReady = process.env.WHATSAPP_TEMPLATE_ORDER_READY?.trim();
  if (!token || !phoneNumberId) {
    return null;
  }
  return { token, phoneNumberId, templateNew, templateReady };
}

async function sendTemplate(params: {
  toPhone: string;
  templateName: string;
  bodyParams: string[];
}): Promise<WhatsAppSendResult> {
  const cfg = config();
  if (!cfg) {
    return { ok: false, reason: "wa_disabled" };
  }
  if (!params.templateName) {
    return { ok: false, reason: "no_template" };
  }
  const to = toE164(params.toPhone);
  if (!to) {
    return { ok: false, reason: "invalid_phone" };
  }

  const url = `https://graph.facebook.com/v21.0/${cfg.phoneNumberId}/messages`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${cfg.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: params.templateName,
          language: { code: "es_MX" },
          components: params.bodyParams.length
            ? [
                {
                  type: "body",
                  parameters: params.bodyParams.map((text) => ({
                    type: "text",
                    text,
                  })),
                },
              ]
            : [],
        },
      }),
    });
    if (!res.ok) {
      return { ok: false, reason: "send_failed" };
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: "send_failed" };
  }
}

export async function sendNewOrderWhatsApp(params: {
  providerPhone: string;
  businessName: string;
  etaMinutes?: number | null;
}): Promise<WhatsAppSendResult> {
  const cfg = config();
  const template = cfg?.templateNew ?? "";
  const eta = etaEstimateLine(params.etaMinutes) ?? "Estimación al confirmar";
  return sendTemplate({
    toPhone: params.providerPhone,
    templateName: template,
    bodyParams: [params.businessName, eta],
  });
}

export async function sendOrderReadyWhatsApp(params: {
  clientPhone: string;
  businessName: string;
  etaMinutes?: number | null;
  fulfillmentType: "PICKUP" | "DELIVERY";
}): Promise<WhatsAppSendResult> {
  const cfg = config();
  const template = cfg?.templateReady ?? "";
  const statusCopy = inTransitLabel(params.fulfillmentType);
  const eta = etaEstimateLine(params.etaMinutes) ?? "";
  const detail = [statusCopy, eta].filter(Boolean).join(". ");
  return sendTemplate({
    toPhone: params.clientPhone,
    templateName: template,
    bodyParams: [params.businessName, detail].filter(Boolean),
  });
}
