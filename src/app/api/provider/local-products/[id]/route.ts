import { NextRequest } from "next/server";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { getSession, requireRole, AuthError } from "@/lib/auth/session";
import { ok, apiError, fromZodError, handleRouteError } from "@/lib/api/response";
import { patchLocalProductSchema } from "@/lib/validators/catalog-f10";
import {
  CatalogForbiddenError,
  CatalogNotFoundError,
  WrongProductRouteError,
  updateLocalProduct,
} from "@/lib/services/local-product.service";
import { ProviderNotFoundError } from "@/lib/services/provider.service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = requireRole(getSession(request), UserRole.PROVIDER);
    const { id } = await params;
    const body = patchLocalProductSchema.parse(await request.json());
    const updated = await updateLocalProduct({
      userId: session.sub,
      providerProductId: id,
      input: body,
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
    });
    return ok(updated);
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError(err.message, err.status);
    }
    if (err instanceof WrongProductRouteError) {
      return apiError(err.message, 400);
    }
    if (err instanceof CatalogForbiddenError) {
      return apiError(err.message, 403);
    }
    if (err instanceof CatalogNotFoundError || err instanceof ProviderNotFoundError) {
      return apiError(err.message, 404);
    }
    if (err instanceof z.ZodError) {
      return apiError("Validation failed", 400, fromZodError(err));
    }
    return handleRouteError(err);
  }
}
