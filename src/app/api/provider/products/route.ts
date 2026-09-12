import { NextRequest } from "next/server";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { getSession, requireRole, AuthError } from "@/lib/auth/session";
import { ok, apiError, fromZodError, handleRouteError } from "@/lib/api/response";
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

const toggleSchema = z.object({
  productId: z.string(),
  isAvailable: z.boolean(),
  price: z.number().min(0, "El precio debe ser mayor o igual a 0").optional(),
  sectionId: z.string().cuid().optional(),
});

/** Proveedor: catálogo global con estado ProviderProduct */
export async function GET(request: NextRequest) {
  try {
    const session = requireRole(getSession(request), UserRole.PROVIDER);
    const catalog = await getProviderCatalog(session.sub);
    return ok(catalog);
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
    const session = requireRole(getSession(request), UserRole.PROVIDER);
    const body = toggleSchema.parse(await request.json());

    const providerProduct = await upsertProviderProduct(
      session.sub,
      body,
      request.headers.get("x-forwarded-for") ?? undefined
    );

    return ok({ providerProduct });
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
