import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AuthError } from "@/lib/auth/session";
import { applyActiveProviderCookie, requireActiveProvider } from "@/lib/auth/active-provider";
import { ok, apiError, fromZodError, handleRouteError } from "@/lib/api/response";
import { methodNotAllowedDeleteProduct } from "@/lib/api/method-not-allowed";
import {
  getProviderCatalog,
  upsertProviderProduct,
  ProductActivationError,
} from "@/lib/services/product.service";
import { ProviderNotFoundError } from "@/lib/services/provider.service";
import {
  CatalogForbiddenError,
  CatalogNotFoundError,
  WrongProductRouteError,
} from "@/lib/services/local-product.service";
import { archivedQuerySchema } from "@/lib/validators/catalog-f10";
import {
  PaginationValidationError,
  parseStrictPagination,
} from "@/lib/services/pagination";

const toggleSchema = z.object({
  productId: z.string(),
  isAvailable: z.boolean(),
  price: z.number().min(0, "El precio debe ser mayor o igual a 0").optional(),
  sectionId: z.string().cuid().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireActiveProvider(request);
    const searchParams = new URL(request.url).searchParams;
    const archivedRaw = searchParams.get("archived");
    const archived =
      archivedRaw == null
        ? undefined
        : archivedQuerySchema.parse(archivedRaw);
    const { page, limit, skip } = parseStrictPagination(searchParams, {
      defaultLimit: 50,
      maxLimit: 100,
    });
    const result = await getProviderCatalog(ctx.session.sub, ctx.provider.id, {
      archived,
      page,
      limit,
      skip,
    });
    const { meta, ...data } = result;
    return applyActiveProviderCookie(
      NextResponse.json({ data, meta }),
      ctx.provider.id
    );
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError(err.message, err.status);
    }
    if (err instanceof ProviderNotFoundError) {
      return apiError(err.message, 404);
    }
    if (err instanceof PaginationValidationError) {
      return apiError(err.message, 400, err.details);
    }
    if (err instanceof z.ZodError) {
      return apiError("Validation failed", 400, fromZodError(err));
    }
    return apiError("Error interno", 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const ctx = await requireActiveProvider(request);
    const body = toggleSchema.parse(await request.json());

    const providerProduct = await upsertProviderProduct(
      ctx.session.sub,
      body,
      request.headers.get("x-forwarded-for") ?? undefined,
      ctx.provider.id
    );

    return applyActiveProviderCookie(ok({ providerProduct }), ctx.provider.id);
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError(err.message, err.status);
    }
    if (err instanceof ProviderNotFoundError) {
      return apiError(err.message, 404);
    }
    if (err instanceof ProductActivationError) {
      return apiError(err.message, 400);
    }
    if (err instanceof WrongProductRouteError) {
      return apiError(err.message, 400);
    }
    if (err instanceof CatalogForbiddenError) {
      return apiError(err.message, 403);
    }
    if (err instanceof CatalogNotFoundError) {
      return apiError(err.message, 404);
    }
    if (err instanceof z.ZodError) {
      return apiError("Validation failed", 400, fromZodError(err));
    }
    return handleRouteError(err);
  }
}

export async function DELETE() {
  return methodNotAllowedDeleteProduct("GET, PATCH", "provider");
}
