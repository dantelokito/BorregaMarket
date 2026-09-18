import { NextRequest } from "next/server";
import { AuthError } from "@/lib/auth/session";
import { applyActiveProviderCookie, requireActiveProvider } from "@/lib/auth/active-provider";
import { ok, apiError, handleRouteError } from "@/lib/api/response";
import { restoreProviderOffer } from "@/lib/services/product.service";
import { ProviderNotFoundError } from "@/lib/services/provider.service";
import { CatalogForbiddenError } from "@/lib/services/local-product.service";
import { RestoreOfferNotFoundError } from "@/lib/catalog/offer";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const ctx = await requireActiveProvider(request);
    const { productId } = await params;
    const data = await restoreProviderOffer({
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
    if (err instanceof RestoreOfferNotFoundError) return apiError(err.message, 404);
    return handleRouteError(err);
  }
}
