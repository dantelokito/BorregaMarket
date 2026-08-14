import { afterEach, describe, expect, it, vi } from "vitest";
import { buildNewOrderHtml, etaEstimateLine } from "@/lib/email/resend";
import { sendNewOrderWhatsApp, sendOrderReadyWhatsApp } from "@/lib/notify/whatsapp";
import { toE164 } from "@/lib/phone";

describe("etaEstimateLine", () => {
  it("returns estimation copy when minutes exist", () => {
    expect(etaEstimateLine(35)).toBe("Listo aprox. en ~35 min (estimación)");
    expect(etaEstimateLine(null)).toBeNull();
  });

  it("includes eta and delivery copy in new-order email", () => {
    const html = buildNewOrderHtml({
      to: "p@test.com",
      businessName: "El Paraíso",
      clientName: "María",
      total: "85.50",
      items: [{ itemName: "Mango", quantity: "1", unitOfMeasure: "PZA" }],
      etaMinutes: 35,
      fulfillmentType: "DELIVERY",
    });
    expect(html).toContain("entrega a domicilio");
    expect(html).toContain("Listo aprox. en ~35 min (estimación)");
  });

  it("omits eta line when minutes are null", () => {
    const html = buildNewOrderHtml({
      to: "p@test.com",
      businessName: "El Paraíso",
      clientName: "María",
      total: "10.00",
      items: [{ itemName: "Mango", quantity: "1", unitOfMeasure: "PZA" }],
      etaMinutes: null,
      fulfillmentType: "PICKUP",
    });
    expect(html).toContain("recoger");
    expect(html).not.toContain("estimación");
  });
});

describe("toE164", () => {
  it("prefixes MX 10-digit numbers", () => {
    expect(toE164("8110000003")).toBe("528110000003");
    expect(toE164("12")).toBeNull();
  });
});

describe("whatsapp no-op", () => {
  afterEach(() => {
    delete process.env.WHATSAPP_TOKEN;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    delete process.env.WHATSAPP_TEMPLATE_ORDER_NEW;
    delete process.env.WHATSAPP_TEMPLATE_ORDER_READY;
    vi.unstubAllGlobals();
  });

  it("no-ops without env keys", async () => {
    const result = await sendNewOrderWhatsApp({
      providerPhone: "8110000002",
      businessName: "El Paraíso",
      etaMinutes: 28,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("wa_disabled");
  });

  it("no-ops ready message without opt-in phone", async () => {
    process.env.WHATSAPP_TOKEN = "token";
    process.env.WHATSAPP_PHONE_NUMBER_ID = "123";
    process.env.WHATSAPP_TEMPLATE_ORDER_READY = "ready";
    const result = await sendOrderReadyWhatsApp({
      clientPhone: "12",
      businessName: "El Paraíso",
      fulfillmentType: "PICKUP",
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("invalid_phone");
  });
});
