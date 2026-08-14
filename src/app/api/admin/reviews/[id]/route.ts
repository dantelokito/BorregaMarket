import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { getSession, requireRole, AuthError } from "@/lib/auth/session";
import { ok, apiError, handleRouteError } from "@/lib/api/response";
import {
  deleteReviewAsAdmin,
  ReviewNotFoundError,
} from "@/lib/services/review.service";

/** Admin: moderar reseña y recalcular agregado */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = requireRole(getSession(request), UserRole.ADMIN);
    const { id } = await params;
    const data = await deleteReviewAsAdmin({
      reviewId: id,
      adminUserId: session.sub,
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
    });
    return ok(data);
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError(err.message, err.status);
    }
    if (err instanceof ReviewNotFoundError) {
      return apiError(err.message, 404);
    }
    return handleRouteError(err);
  }
}
