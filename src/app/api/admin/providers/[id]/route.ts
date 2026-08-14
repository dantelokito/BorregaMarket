import { NextRequest } from "next/server";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { getSession, requireRole, AuthError } from "@/lib/auth/session";
import { ok, apiError, fromZodError } from "@/lib/api/response";
import {
  updateProviderVerification,
  ProviderNotFoundError,
} from "@/lib/services/provider.service";

const verifySchema = z.object({
  isVerified: z.boolean(),
});

/** Admin: verificar o desverificar proveedor */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = requireRole(getSession(request), UserRole.ADMIN);
    const { id } = await params;
    const body = verifySchema.parse(await request.json());

    const updated = await updateProviderVerification(
      id,
      body.isVerified,
      session.sub,
      request.headers.get("x-forwarded-for") ?? undefined
    );

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
    return apiError("Error interno", 500);
  }
}
