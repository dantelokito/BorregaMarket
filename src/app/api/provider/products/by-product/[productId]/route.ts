import { NextRequest } from "next/server";
import { z } from "zod";
import { AuthError } from "@/lib/auth/session";
import { applyActiveProviderCookie, requireActiveProvider } from "@/lib/auth/active-provider";
import { ok, apiError, fromZodError, handleRouteError } from "@/lib/api/response";
import { methodNotAllowedDeleteProduct } from "@/lib/api/method-not-allowed";
import { patchOfferByProductSchema } from "@/lib/validators/catalog-f10";
import {
  patchOfferByProduct,
  ProductActivationError,
} from "@/lib/services/product.service";
import { ProviderNotFoundError } from "@/lib/services/provider.service";
import {
  CatalogForbiddenError,
  CatalogNotFoundError,
} from "@/lib/services/local-product.service";
import {
  ConfirmDiscardRequiredError,
  EncargarActiveError,
  MasterMutationForbiddenError,
  OfferValidationError,
} from "@/lib/catalog/offer";

function mapOfferError(err: unknown) {
  if (err instanceof AuthError) return apiError(err.message, err.status);
  if (err instanceof ProviderNotFoundError) return apiError(err.message, 404);
  if (err instanceof CatalogForbiddenError) return apiError(err.message, 403);
  if (err instanceof CatalogNotFoundError) return apiError(err.message, 404);
  if (err instanceof ProductActivationError) return apiError(err.message, 400);
  if (err instanceof EncargarActiveError) return apiError(err.message, 409, err.details());
  if (err instanceof ConfirmDiscardRequiredError) {
    return apiError(err.message, 400, err.details());
  }
  if (err instanceof MasterMutationForbiddenError) {
    return apiError(err.message, 400, err.details());
  }
  if (err instanceof OfferValidationError) return apiError(err.message, 400, err.details);
  if (err instanceof z.ZodError) return apiError("Validation failed", 400, fromZodError(err));
  return null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const ctx = await requireActiveProvider(request);
    const { productId } = await params;
    const body = patchOfferByProductSchema.parse(await request.json());
    const result = await patchOfferByProduct({
      userId: ctx.session.sub,
      providerId: ctx.provider.id,
      productId,
      input: body,
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
    });
    return applyActiveProviderCookie(
      ok(result.row, result.created ? 201 : 200),
      ctx.provider.id
    );
  } catch (err) {
    return mapOfferError(err) ?? handleRouteError(err);
  }
}

export async function DELETE() {
  return methodNotAllowedDeleteProduct("GET, PATCH", "provider");
}
