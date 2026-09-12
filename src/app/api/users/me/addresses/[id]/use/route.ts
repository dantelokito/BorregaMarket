import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { getSession, requireRole, AuthError } from "@/lib/auth/session";
import { ok, apiError, handleRouteError } from "@/lib/api/response";
import {
  markLastUsed,
  AddressNotFoundError,
} from "@/lib/services/address.service";

/** Cliente: stamp lastUsedAt para hidratar Explorar (ADR-027). No cambia isDefault. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = requireRole(getSession(request), UserRole.CLIENT);
    const { id } = await params;
    const data = await markLastUsed(session.sub, id);
    return ok(data);
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError(err.message, err.status);
    }
    if (err instanceof AddressNotFoundError) {
      return apiError(err.message, 404);
    }
    return handleRouteError(err);
  }
}
