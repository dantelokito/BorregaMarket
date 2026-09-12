import { NextRequest } from "next/server";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { getSession, requireRole, AuthError } from "@/lib/auth/session";
import { ok, apiError, fromZodError, handleRouteError } from "@/lib/api/response";
import { patchSectionSchema } from "@/lib/validators/catalog-f10";
import {
  deleteProviderSection,
  updateProviderSection,
} from "@/lib/services/section.service";
import {
  CatalogConflictError,
  CatalogForbiddenError,
  CatalogNotFoundError,
} from "@/lib/services/local-product.service";
import { ProviderNotFoundError } from "@/lib/services/provider.service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = requireRole(getSession(request), UserRole.PROVIDER);
    const { id } = await params;
    const body = patchSectionSchema.parse(await request.json());
    const updated = await updateProviderSection({
      userId: session.sub,
      sectionId: id,
      name: body.name,
      sortOrder: body.sortOrder,
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
    });
    return ok(updated);
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError(err.message, err.status);
    }
    if (err instanceof CatalogForbiddenError) {
      return apiError(err.message, 403);
    }
    if (err instanceof CatalogConflictError) {
      return apiError(err.message, 409, [{ field: "name", message: err.message }]);
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = requireRole(getSession(request), UserRole.PROVIDER);
    const { id } = await params;
    const deleted = await deleteProviderSection({
      userId: session.sub,
      sectionId: id,
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
    });
    return ok(deleted);
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError(err.message, err.status);
    }
    if (err instanceof CatalogForbiddenError) {
      return apiError(err.message, 403);
    }
    if (err instanceof CatalogConflictError) {
      return apiError(err.message, 409, [
        { field: "id", message: "Reasigna los productos a otra sección" },
      ]);
    }
    if (err instanceof CatalogNotFoundError || err instanceof ProviderNotFoundError) {
      return apiError(err.message, 404);
    }
    return handleRouteError(err);
  }
}
