import { NextRequest } from "next/server";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { getSession, requireRole, AuthError } from "@/lib/auth/session";
import { ok, apiError, fromZodError, handleRouteError } from "@/lib/api/response";
import { createLocalProductSchema } from "@/lib/validators/catalog-f10";
import {
  CatalogForbiddenError,
  CatalogNotFoundError,
  createLocalProduct,
} from "@/lib/services/local-product.service";
import { ProviderNotFoundError } from "@/lib/services/provider.service";

export async function POST(request: NextRequest) {
  try {
    const session = requireRole(getSession(request), UserRole.PROVIDER);
    const body = createLocalProductSchema.parse(await request.json());
    const created = await createLocalProduct({
      userId: session.sub,
      input: body,
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
    });
    return ok(created, 201);
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError(err.message, err.status);
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
