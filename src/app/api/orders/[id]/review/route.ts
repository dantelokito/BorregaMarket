import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { getSession, requireRole, AuthError } from "@/lib/auth/session";
import { ok, apiError } from "@/lib/api/response";
import {
  getOrderReview,
  ReviewNotFoundError,
} from "@/lib/services/review.service";
import { handleOrderRouteError } from "@/lib/orders/http";

/** Cliente dueño o ADMIN: obtener reseña del pedido */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = requireRole(
      getSession(request),
      UserRole.CLIENT,
      UserRole.ADMIN
    );
    const { id } = await params;
    const data = await getOrderReview({
      orderId: id,
      userId: session.sub,
      role: session.role,
    });
    return ok(data);
  } catch (err) {
    if (err instanceof ReviewNotFoundError) {
      return apiError(err.message, 404);
    }
    if (err instanceof AuthError) {
      return apiError(err.message, err.status);
    }
    return handleOrderRouteError(err);
  }
}
