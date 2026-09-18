import { NextRequest } from "next/server";
import { z } from "zod";
import { AuthError } from "@/lib/auth/session";
import { applyActiveProviderCookie, requireActiveProvider } from "@/lib/auth/active-provider";
import { ok, apiError, fromZodError, handleRouteError } from "@/lib/api/response";
import { archiveProviderOffer } from "@/lib/services/product.service";
import { ProviderNotFoundError } from "@/lib/services/provider.service";
import { CatalogForbiddenError } from "@/lib/services/local-product.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const ctx = await requireActiveProvider(request);
    const { productId } = await params;
    const data = await archiveProviderOffer({
      userId: ctx.session.sub,
      providerId: ctx.provider.id,
      productId,
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
    });
    return applyActiveProviderCookie(ok(data), ctx.provider.id);
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.message, err.status);
    if (err instanceof ProviderNotFoundError) return apiError(err.message, 404);
    if (err instanceof CatalogForbiddenError) return apiError(err.message, 403);
    if (err instanceof z.ZodError) return apiError("Validation failed", 400, fromZodError(err));
    return handleRouteError(err);
  }
}
