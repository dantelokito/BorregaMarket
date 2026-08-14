import { inngest } from "@/lib/inngest/client";
import prisma from "@/lib/prisma";
import {
  sendContactNotification,
  recordContactNotificationFailure,
} from "@/lib/email/resend";

export const notifyContactRequested = inngest.createFunction(
  {
    id: "notify-contact-requested",
    retries: 2,
    onFailure: async ({ event }) => {
      const data = event.data.event.data as {
        providerId: string;
        productIds?: string[];
        productNames?: string[];
        source?: string;
        userId?: string;
        ipAddress?: string;
      };
      await recordContactNotificationFailure({
        providerId: data.providerId,
        source: data.source ?? "unknown",
        productIds: data.productIds ?? [],
        productNames: data.productNames ?? [],
        reason: "send_failed",
        userId: data.userId,
        ipAddress: data.ipAddress,
      });
    },
  },
  { event: "notify/contact.requested" },
  async ({ event }) => {
    const {
      providerId,
      productIds = [],
      productNames = [],
      source = "unknown",
      userId,
      ipAddress,
      to,
      businessName,
      timestampIso,
    } = event.data as {
      providerId: string;
      productIds?: string[];
      productNames?: string[];
      source?: string;
      userId?: string;
      ipAddress?: string;
      to?: string;
      businessName?: string;
      timestampIso?: string;
    };

    let ownerEmail = to?.trim() ?? "";
    let name = businessName ?? "";
    if (!ownerEmail || !name) {
      const provider = await prisma.provider.findUnique({
        where: { id: providerId },
        include: { user: { select: { email: true } } },
      });
      ownerEmail = provider?.user.email?.trim() ?? ownerEmail;
      name = provider?.businessName ?? name;
    }

    const result = await sendContactNotification({
      to: ownerEmail,
      businessName: name,
      providerId,
      productNames,
      source,
      timestampIso: timestampIso ?? new Date().toISOString(),
      userId,
      ipAddress,
    });

    if (!result.ok && result.reason === "send_failed") {
      throw new Error("Resend send_failed");
    }

    if (!result.ok && result.reason) {
      await recordContactNotificationFailure({
        providerId,
        source,
        productIds,
        productNames,
        reason: result.reason,
        userId,
        ipAddress,
      });
    }
  }
);
