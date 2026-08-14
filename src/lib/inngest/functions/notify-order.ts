import { AuditAction, SystemModule } from "@prisma/client";
import { inngest } from "@/lib/inngest/client";
import prisma from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { sendNewOrderEmail } from "@/lib/email/resend";
import { sendNewOrderWhatsApp } from "@/lib/notify/whatsapp";
import { formatMoney, formatQuantity } from "@/lib/money";

async function recordOrderNotificationFailure(params: {
  orderId: string;
  reason: string;
}) {
  await writeAuditLog({
    module: SystemModule.ORDERS,
    action: AuditAction.CREATE,
    entityId: params.orderId,
    details: {
      notificationFailed: true,
      reason: params.reason,
    },
  });
}

export const notifyOrderCreated = inngest.createFunction(
  {
    id: "notify-order-created",
    retries: 2,
    onFailure: async ({ event }) => {
      const data = event.data.event.data as { orderId: string };
      if (data?.orderId) {
        await recordOrderNotificationFailure({
          orderId: data.orderId,
          reason: "send_failed",
        });
      }
    },
  },
  { event: "notify/order.created" },
  async ({ event }) => {
    const { orderId } = event.data as { orderId: string };
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        provider: { include: { user: { select: { email: true } } } },
        client: { select: { name: true, phone: true } },
      },
    });

    if (!order) {
      return;
    }

    const to = order.provider.user.email?.trim() ?? "";
    if (to) {
      const result = await sendNewOrderEmail({
        to,
        businessName: order.provider.businessName,
        clientName: order.client?.name ?? order.customerName ?? "Cliente",
        clientPhone: order.client?.phone,
        total: formatMoney(order.total),
        items: order.items.map((item) => ({
          itemName: item.itemName,
          quantity: formatQuantity(item.quantity),
          unitOfMeasure: item.unitOfMeasure,
        })),
        etaMinutes: order.etaMinutes,
        fulfillmentType: order.fulfillmentType,
      });

      if (!result.ok && result.reason === "send_failed") {
        throw new Error("Resend send_failed");
      }

      if (!result.ok && result.reason) {
        await recordOrderNotificationFailure({ orderId, reason: result.reason });
      }
    } else {
      await recordOrderNotificationFailure({ orderId, reason: "no_email" });
    }

    const wa = await sendNewOrderWhatsApp({
      providerPhone: order.provider.phone,
      businessName: order.provider.businessName,
      etaMinutes: order.etaMinutes,
    });
    if (wa.reason === "send_failed") {
      await recordOrderNotificationFailure({ orderId, reason: "wa_send_failed" });
    }
  }
);
