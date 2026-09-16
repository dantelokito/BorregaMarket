import { NextRequest } from "next/server";
import { z } from "zod";
import { ProductScope, SystemModule } from "@prisma/client";
import { AuthError } from "@/lib/auth/session";
import { requireAdminModule } from "@/lib/auth/require-admin-module";
import { ok, paginated, apiError, fromZodError, handleRouteError } from "@/lib/api/response";
import {
  adminProductListQuerySchema,
  createAdminProductSchema,
} from "@/lib/validators/catalog-f10";
import {
  AdminQueryError,
  createAdminProduct,
  listAdminProducts,
  ProductConflictError,
} from "@/lib/services/admin-product.service";
import { PaginationValidationError } from "@/lib/services/pagination";

export async function GET(request: NextRequest) {
  try {
    await requireAdminModule(request, SystemModule.PRODUCTS, "view");
    const searchParams = new URL(request.url).searchParams;
    const query = adminProductListQuerySchema.parse({
      q: searchParams.get("q") ?? undefined,
      isActive: searchParams.get("isActive") ?? undefined,
      scope: searchParams.get("scope") ?? undefined,
      ownerProviderId: searchParams.get("ownerProviderId") ?? undefined,
    });
    const result = await listAdminProducts({
      searchParams,
      q: query.q,
      isActive: query.isActive,
      scope: query.scope as ProductScope | undefined,
      ownerProviderId: query.ownerProviderId,
    });
    return paginated(result.data, result.meta);
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError(err.message, err.status);
    }
    if (err instanceof PaginationValidationError || err instanceof AdminQueryError) {
      return apiError(err.message, 400, err.details);
    }
    if (err instanceof z.ZodError) {
      return apiError("Validation failed", 400, fromZodError(err));
    }
    return handleRouteError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminModule(request, SystemModule.PRODUCTS, "create");
    const body = createAdminProductSchema.parse(await request.json());
    const created = await createAdminProduct({
      input: body,
      adminUserId: session.sub,
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
    });
    return ok(created, 201);
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError(err.message, err.status);
    }
    if (err instanceof ProductConflictError) {
      return apiError(err.message, 409, [
        { field: "slug", message: "Slug duplicado en el catálogo global" },
      ]);
    }
    if (err instanceof z.ZodError) {
      return apiError("Validation failed", 400, fromZodError(err));
    }
    return handleRouteError(err);
  }
}
