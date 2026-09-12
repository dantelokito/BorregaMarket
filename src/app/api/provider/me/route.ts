import { NextRequest } from "next/server";
import { AuthError } from "@/lib/auth/session";
import { applyActiveProviderCookie, requireActiveProvider } from "@/lib/auth/active-provider";
import { ok, apiError, handleRouteError } from "@/lib/api/response";
import { patchProviderSettingsSchema } from "@/lib/validators/provider-settings";
import {
  toProviderSettings,
  updateProviderSettings,
  GoogleReviewsLockedError,
  ProviderNotFoundError,
  ProviderSettingsValidationError,
} from "@/lib/services/provider.service";

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireActiveProvider(request);
    const response = ok(toProviderSettings(ctx.provider));
    return applyActiveProviderCookie(response, ctx.provider.id);
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError(err.message, err.status);
    }
    if (err instanceof ProviderNotFoundError) {
      return apiError(err.message, 404);
    }
    return apiError("Error interno", 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const ctx = await requireActiveProvider(request);
    const body = patchProviderSettingsSchema.parse(await request.json());
    const data = await updateProviderSettings({
      userId: ctx.session.sub,
      providerId: ctx.provider.id,
      input: body,
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
    });
    const response = ok(data);
    return applyActiveProviderCookie(response, ctx.provider.id);
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
