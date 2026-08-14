import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { getSession, requireRole, AuthError } from "@/lib/auth/session";
import { ok, apiError, handleRouteError } from "@/lib/api/response";
import { patchProviderSettingsSchema } from "@/lib/validators/provider-settings";
import {
  getProviderByUserId,
  toProviderSettings,
  updateProviderSettings,
  GoogleReviewsLockedError,
  ProviderNotFoundError,
  ProviderSettingsValidationError,
} from "@/lib/services/provider.service";

/** Proveedor: obtener perfil del negocio autenticado */
export async function GET(request: NextRequest) {
  try {
    const session = requireRole(getSession(request), UserRole.PROVIDER);
    const provider = await getProviderByUserId(session.sub);

    if (!provider) {
      return apiError("Perfil de proveedor no encontrado", 404);
    }

    return ok(toProviderSettings(provider));
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError(err.message, err.status);
    }
    return apiError("Error interno", 500);
  }
}

/** Proveedor: actualizar tiempos, delivery y vínculo Google (gate US-REV-04) */
export async function PATCH(request: NextRequest) {
  try {
    const session = requireRole(getSession(request), UserRole.PROVIDER);
    const body = patchProviderSettingsSchema.parse(await request.json());
    const data = await updateProviderSettings({
      userId: session.sub,
      input: body,
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
    });
    return ok(data);
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError(err.message, err.status);
    }
    if (err instanceof GoogleReviewsLockedError) {
      return apiError(err.message, 403);
    }
    if (err instanceof ProviderNotFoundError) {
      return apiError(err.message, 404);
    }
    if (err instanceof ProviderSettingsValidationError) {
      return apiError(err.message, 400, err.details);
    }
    if (err instanceof SyntaxError) {
      return apiError("Validation failed", 400, [
        { field: "body", message: "JSON inválido" },
      ]);
    }
    return handleRouteError(err);
  }
}
