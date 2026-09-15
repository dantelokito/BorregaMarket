import { NextRequest } from "next/server";
import { z } from "zod";
import { AuthError } from "@/lib/auth/session";
import { applyActiveProviderCookie, requireActiveProvider } from "@/lib/auth/active-provider";
import { ok, apiError, fromZodError, handleRouteError } from "@/lib/api/response";
import { reorderSectionsSchema } from "@/lib/validators/catalog-f10";
import { reorderProviderSections } from "@/lib/services/section.service";
import {
  CatalogConflictError,
  CatalogForbiddenError,
} from "@/lib/services/local-product.service";
import { ProviderNotFoundError } from "@/lib/services/provider.service";

export async function PATCH(request: NextRequest) {
  try {
    const ctx = await requireActiveProvider(request);
    const body = reorderSectionsSchema.parse(await request.json());
    const data = await reorderProviderSections({
      userId: ctx.session.sub,
      providerId: ctx.provider.id,
      ids: body.ids,
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
    });
    return applyActiveProviderCookie(ok(data), ctx.provider.id);
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError(err.message, err.status);
    }
    if (err instanceof CatalogForbiddenError) {
      return apiError(err.message, 403);
    }
    if (err instanceof CatalogConflictError) {
      return apiError(err.message, 400, [{ field: "ids", message: err.message }]);
    }
    if (err instanceof ProviderNotFoundError) {
      return apiError(err.message, 404);
    }
    if (err instanceof z.ZodError) {
      return apiError("Validation failed", 400, fromZodError(err));
    }
    return handleRouteError(err);
  }
}
