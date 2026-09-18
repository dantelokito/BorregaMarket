import { NextRequest } from "next/server";
import { z } from "zod";
import { AuthError } from "@/lib/auth/session";
import { applyActiveProviderCookie, requireActiveProvider } from "@/lib/auth/active-provider";
import { ok, apiError, fromZodError, handleRouteError } from "@/lib/api/response";
import { patchOfferPriceSchema } from "@/lib/validators/catalog-f10";
import { patchOfferPrice, ProductActivationError } from "@/lib/services/product.service";
import { ProviderNotFoundError } from "@/lib/services/provider.service";
import { CatalogForbiddenError } from "@/lib/services/local-product.service";
import { OfferValidationError } from "@/lib/catalog/offer";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const ctx = await requireActiveProvider(request);
    const { productId } = await params;
    const body = patchOfferPriceSchema.parse(await request.json());
    const data = await patchOfferPrice({
      userId: ctx.session.sub,
      providerId: ctx.provider.id,
      productId,
      price: body.price,
    });
    return applyActiveProviderCookie(ok(data), ctx.provider.id);
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.message, err.status);
    if (err instanceof ProviderNotFoundError) return apiError(err.message, 404);
    if (err instanceof CatalogForbiddenError) return apiError(err.message, 403);
    if (err instanceof ProductActivationError) return apiError(err.message, 400);
    if (err instanceof OfferValidationError) return apiError(err.message, 400, err.details);
    if (err instanceof z.ZodError) return apiError("Validation failed", 400, fromZodError(err));
    return handleRouteError(err);
  }
}
