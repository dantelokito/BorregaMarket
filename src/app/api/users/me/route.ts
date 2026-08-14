import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { getSession, requireRole, AuthError } from "@/lib/auth/session";
import { ok, apiError, handleRouteError } from "@/lib/api/response";
import {
  getClientProfile,
  updateClientProfile,
} from "@/lib/services/user.service";

/** Cliente: obtener perfil autenticado */
export async function GET(request: NextRequest) {
  try {
    const session = requireRole(getSession(request), UserRole.CLIENT);
    const profile = await getClientProfile(session.sub);
    return ok(profile);
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError(err.message, err.status);
    }
    return apiError("Error interno", 500);
  }
}

/** Cliente: actualizar perfil (name, phone) */
export async function PATCH(request: NextRequest) {
  try {
    const session = requireRole(getSession(request), UserRole.CLIENT);
    const body = await request.json();
    const profile = await updateClientProfile(
      session.sub,
      body,
      request.headers.get("x-forwarded-for") ?? undefined
    );
    return ok(profile);
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError(err.message, err.status);
    }
    return handleRouteError(err);
  }
}
