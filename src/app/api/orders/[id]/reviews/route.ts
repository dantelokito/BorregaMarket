import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { getSession, requireRole, AuthError } from "@/lib/auth/session";
import { ok, apiError, handleRouteError } from "@/lib/api/response";
import { createReviewSchema } from "@/lib/validators/review";
import {
  createReview,
  ReviewConflictError,
} from "@/lib/services/review.service";
import { handleOrderRouteError } from "@/lib/orders/http";

/** Cliente: crear reseña del pedido propio en DELIVERED */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = requireRole(getSession(request), UserRole.CLIENT);
    const { id } = await params;
    const body = createReviewSchema.parse(await request.json());
    const data = await createReview({
      orderId: id,
      clientId: session.sub,
      input: body,
    });
    return ok(data, 201);
  } catch (err) {
    if (err instanceof ReviewConflictError) {
      return apiError(err.message, 409);
    }
    if (err instanceof AuthError) {
      return apiError(err.message, err.status);
    }
    if (err instanceof SyntaxError) {
      return apiError("Validation failed", 400, [
        { field: "body", message: "JSON inválido" },
      ]);
    }
    return handleOrderRouteError(err);
  }
}
