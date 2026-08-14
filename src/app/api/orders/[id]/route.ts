import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { getSession, requireRole } from "@/lib/auth/session";
import { ok } from "@/lib/api/response";
import { handleOrderRouteError } from "@/lib/orders/http";
import { getOrderById, transitionStatus } from "@/lib/services/order.service";
import { patchOrderStatusSchema } from "@/lib/validators/order";

function clientIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    undefined
  );
}

/** Detalle: CLIENT dueño, PROVIDER del negocio, ADMIN */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = requireRole(
      getSession(request),
      UserRole.CLIENT,
      UserRole.PROVIDER,
      UserRole.ADMIN
    );
    const { id } = await params;
    const order = await getOrderById({ orderId: id, session });
    return ok(order);
  } catch (err) {
    return handleOrderRouteError(err);
  }
}

/** Transición de status. CLIENT solo PENDING → CANCELLED */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = requireRole(
      getSession(request),
      UserRole.CLIENT,
      UserRole.PROVIDER,
      UserRole.ADMIN
    );
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
