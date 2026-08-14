import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { getSession, requireRole } from "@/lib/auth/session";
import { ok } from "@/lib/api/response";
import { handleOrderRouteError } from "@/lib/orders/http";
import { transitionStatus } from "@/lib/services/order.service";
import { patchOrderStatusSchema } from "@/lib/validators/order";

function clientIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    undefined
  );
}

/** Proveedor: avanzar estado de una orden de su negocio */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = requireRole(getSession(request), UserRole.PROVIDER);
    const { id } = await params;
    const body = patchOrderStatusSchema.parse(await request.json());
    const order = await transitionStatus({
      orderId: id,
      nextStatus: body.status,
      session,
      ipAddress: clientIp(request),
    });
    return ok(order);
  } catch (err) {
    return handleOrderRouteError(err);
  }
}
