import { NextRequest } from "next/server";
import { z } from "zod";
import { AuthError } from "@/lib/auth/session";
import { applyActiveProviderCookie, requireActiveProvider } from "@/lib/auth/active-provider";
import { ok, apiError, fromZodError, handleRouteError } from "@/lib/api/response";
import { createLocalProductSchema } from "@/lib/validators/catalog-f10";
import {
  CatalogForbiddenError,
  CatalogNotFoundError,
  createLocalProduct,
} from "@/lib/services/local-product.service";
import { ProviderNotFoundError } from "@/lib/services/provider.service";
import { methodNotAllowedDeleteProduct } from "@/lib/api/method-not-allowed";
import { OfferValidationError } from "@/lib/catalog/offer";

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireActiveProvider(request);
    const body = createLocalProductSchema.parse(await request.json());
    const created = await createLocalProduct({
      userId: ctx.session.sub,
      providerId: ctx.provider.id,
      input: body,
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
    });
    return applyActiveProviderCookie(ok(created, 201), ctx.provider.id);
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError(err.message, err.status);
    }
    if (err instanceof CatalogForbiddenError) {
      return apiError(err.message, 403);
    }
    if (err instanceof CatalogNotFoundError || err instanceof ProviderNotFoundError) {
      return apiError(err.message, 404);
    }
    if (err instanceof OfferValidationError) {
      return apiError(err.message, 400, err.details);
    }
    if (err instanceof z.ZodError) {
      return apiError("Validation failed", 400, fromZodError(err));
    }
    return handleRouteError(err);
  }
}

export async function DELETE() {
  return methodNotAllowedDeleteProduct("POST", "provider");
}
