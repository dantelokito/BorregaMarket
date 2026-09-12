import { NextRequest } from "next/server";
import { z } from "zod";
import { AuthError } from "@/lib/auth/session";
import { applyActiveProviderCookie, requireActiveProvider } from "@/lib/auth/active-provider";
import { ok, apiError, fromZodError, handleRouteError } from "@/lib/api/response";
import { createSectionSchema } from "@/lib/validators/catalog-f10";
import {
  createProviderSection,
  listProviderSections,
} from "@/lib/services/section.service";
import { CatalogConflictError, CatalogForbiddenError } from "@/lib/services/local-product.service";
import { ProviderNotFoundError } from "@/lib/services/provider.service";

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireActiveProvider(request);
    const data = await listProviderSections(ctx.session.sub, ctx.provider.id);
    return applyActiveProviderCookie(ok(data), ctx.provider.id);
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError(err.message, err.status);
    }
    if (err instanceof CatalogForbiddenError) {
      return apiError(err.message, 403);
    }
    if (err instanceof ProviderNotFoundError) {
      return apiError(err.message, 404);
    }
    return handleRouteError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireActiveProvider(request);
    const body = createSectionSchema.parse(await request.json());
    const created = await createProviderSection({
      userId: ctx.session.sub,
      providerId: ctx.provider.id,
      name: body.name,
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
    });
    return applyActiveProviderCookie(ok(created, 201), ctx.provider.id);
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError(err.message, err.status);
    }
    if (err instanceof CatalogConflictError) {
      return apiError(err.message, 409, [
        { field: "name", message: err.message },
      ]);
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
