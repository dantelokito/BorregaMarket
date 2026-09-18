import { NextRequest } from "next/server";
import { z } from "zod";
import { AuthError } from "@/lib/auth/session";
import { applyActiveProviderCookie, requireActiveProvider } from "@/lib/auth/active-provider";
import { paginated, apiError, fromZodError, handleRouteError } from "@/lib/api/response";
import { listOfferPriceHistory } from "@/lib/services/product.service";
import { ProviderNotFoundError } from "@/lib/services/provider.service";
import { CatalogForbiddenError } from "@/lib/services/local-product.service";
import {
  PaginationValidationError,
  parseStrictPagination,
} from "@/lib/services/pagination";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ providerProductId: string }> }
) {
  try {
    const ctx = await requireActiveProvider(request);
    const { providerProductId } = await params;
    const { page, limit, skip } = parseStrictPagination(new URL(request.url).searchParams, {
      defaultLimit: 50,
      maxLimit: 100,
    });
    const result = await listOfferPriceHistory({
      userId: ctx.session.sub,
      providerId: ctx.provider.id,
      providerProductId,
      page,
      limit,
      skip,
    });
    return applyActiveProviderCookie(paginated(result.data, result.meta), ctx.provider.id);
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.message, err.status);
    if (err instanceof ProviderNotFoundError) return apiError(err.message, 404);
    if (err instanceof CatalogForbiddenError) return apiError(err.message, 403);
    if (err instanceof PaginationValidationError) {
      return apiError(err.message, 400, err.details);
    }
    if (err instanceof z.ZodError) return apiError("Validation failed", 400, fromZodError(err));
    return handleRouteError(err);
  }
}
