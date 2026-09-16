import { NextRequest } from "next/server";
import { AuthError } from "@/lib/auth/session";
import { applyActiveProviderCookie, requireActiveProvider } from "@/lib/auth/active-provider";
import { apiError, fromZodError, handleRouteError, paginated } from "@/lib/api/response";
import { parsePaginationParams } from "@/lib/services/pagination";
import { ProviderNotFoundError } from "@/lib/services/provider.service";
import { CatalogForbiddenError } from "@/lib/services/local-product.service";
import { listInventory } from "@/lib/services/inventory.service";
import { inventoryListQuerySchema } from "@/lib/validators/inventory";
import { ZodError } from "zod";

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireActiveProvider(request);
    const { searchParams } = new URL(request.url);
    inventoryListQuerySchema.parse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });
    const { page, limit, skip } = parsePaginationParams(searchParams, {
      defaultLimit: 50,
      maxLimit: 100,
    });
    const result = await listInventory({
      userId: ctx.session.sub,
      providerId: ctx.provider.id,
      page,
      limit,
      skip,
    });
    return applyActiveProviderCookie(paginated(result.data, result.meta), ctx.provider.id);
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.message, err.status);
    if (err instanceof ProviderNotFoundError) return apiError(err.message, 404);
    if (err instanceof CatalogForbiddenError) return apiError(err.message, 403);
    if (err instanceof ZodError) {
      return apiError("Datos inválidos", 400, fromZodError(err));
    }
    return handleRouteError(err);
  }
}
