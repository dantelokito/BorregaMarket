import { NextRequest } from "next/server";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { getSession, requireRole, AuthError } from "@/lib/auth/session";
import { ok, apiError, fromZodError, handleRouteError } from "@/lib/api/response";
import { patchAdminProviderSchema } from "@/lib/validators/provider-settings";
import {
  updateAdminProvider,
  ProviderNotFoundError,
} from "@/lib/services/provider.service";

/** Admin: verificar proveedor y/o par de marca (F5). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = requireRole(getSession(request), UserRole.ADMIN);
    const { id } = await params;
    const body = patchAdminProviderSchema.parse(await request.json());

    const updated = await updateAdminProvider({
      id,
      input: body,
      adminUserId: session.sub,
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
    });

    return ok(updated);
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError(err.message, err.status);
    }
    if (err instanceof ProviderNotFoundError) {
      return apiError(err.message, 404);
    }
    if (err instanceof z.ZodError) {
      return apiError("Validation failed", 400, fromZodError(err));
    }
    return handleRouteError(err);
  }
}
