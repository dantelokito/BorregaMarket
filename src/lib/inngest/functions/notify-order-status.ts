import { AuditAction, OrderStatus, SystemModule } from "@prisma/client";
import { inngest } from "@/lib/inngest/client";
import prisma from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { sendOrderReadyWhatsApp } from "@/lib/notify/whatsapp";

export const notifyOrderStatus = inngest.createFunction(
  {
    id: "notify-order-status",
    retries: 2,
    onFailure: async ({ event }) => {
      const data = event.data.event.data as { orderId?: string };
      if (data?.orderId) {
        await writeAuditLog({
          module: SystemModule.ORDERS,
          action: AuditAction.UPDATE,
          entityId: data.orderId,
          details: {
            notificationFailed: true,
            reason: "send_failed",
            event: "notify/order.status",
          },
        });
      }
    },
  },
  { event: "notify/order.status" },
  async ({ event }) => {
    const { orderId, status } = event.data as {
      orderId: string;
      status?: OrderStatus;
    };
    if (status !== OrderStatus.IN_TRANSIT) {
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        provider: { select: { businessName: true } },
        client: { select: { phone: true, whatsappOptIn: true } },
      },
    });
    if (!order?.client?.whatsappOptIn || !order.client.phone) {
      return;
    }

    const wa = await sendOrderReadyWhatsApp({
      clientPhone: order.client.phone,
      businessName: order.provider.businessName,
      etaMinutes: order.etaMinutes,
      fulfillmentType: order.fulfillmentType,
    });
    if (wa.reason === "send_failed") {
      await writeAuditLog({
        module: SystemModule.ORDERS,
        action: AuditAction.UPDATE,
        entityId: orderId,
        details: {
          notificationFailed: true,
          reason: "wa_send_failed",
          event: "notify/order.status",
        },
      });
    }
  }
);
