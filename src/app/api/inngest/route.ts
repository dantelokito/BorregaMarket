import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { auditIpPurge } from "@/lib/inngest/functions/audit-ip-purge";
import { notifyContactRequested } from "@/lib/inngest/functions/notify-contact";
import { notifyOrderCreated } from "@/lib/inngest/functions/notify-order";
import { notifyOrderStatus } from "@/lib/inngest/functions/notify-order-status";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [notifyContactRequested, notifyOrderCreated, notifyOrderStatus, auditIpPurge],
});
