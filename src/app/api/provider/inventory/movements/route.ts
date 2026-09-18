import { NextRequest, NextResponse } from "next/server";
import { AuthError } from "@/lib/auth/session";
import { applyActiveProviderCookie, requireActiveProvider } from "@/lib/auth/active-provider";
import { apiError, handleRouteError } from "@/lib/api/response";
import { ProviderNotFoundError } from "@/lib/services/provider.service";
import { CatalogForbiddenError } from "@/lib/services/local-product.service";
import {
  InventoryValidationError,
  listInventoryMovements,
  parseInventoryMovementQuery,
} from "@/lib/services/inventory.service";
import {
  PaginationValidationError,
  parseStrictPagination,
} from "@/lib/services/pagination";

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireActiveProvider(request);
    const search = new URL(request.url).searchParams;
    const { page, limit, skip } = parseStrictPagination(search, {
      defaultLimit: 50,
      maxLimit: 100,
    });
    const filters = parseInventoryMovementQuery(search);
    const result = await listInventoryMovements({
      userId: ctx.session.sub,
      providerId: ctx.provider.id,
      page,
      limit,
      skip,
      kind: filters.kind,
      providerProductId: filters.providerProductId,
      from: filters.from,
      to: filters.to,
    });
    return applyActiveProviderCookie(
      NextResponse.json({ data: result.data, meta: result.meta }),
      ctx.provider.id
    );
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.message, err.status);
    if (err instanceof ProviderNotFoundError) return apiError(err.message, 404);
    if (err instanceof CatalogForbiddenError) return apiError(err.message, 403);
    if (err instanceof PaginationValidationError) {
      return apiError(err.message, 400, err.details);
    }
    if (err instanceof InventoryValidationError) {
      return apiError(err.message, 400, err.details);
    }
    return handleRouteError(err);
  }
}
