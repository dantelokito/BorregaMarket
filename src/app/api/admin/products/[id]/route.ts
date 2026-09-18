import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SystemModule } from "@prisma/client";
import { AuthError } from "@/lib/auth/session";
import { requireAdminModule } from "@/lib/auth/require-admin-module";
import { ok, apiError, fromZodError, handleRouteError } from "@/lib/api/response";
import { methodNotAllowedDeleteProduct } from "@/lib/api/method-not-allowed";
import { patchAdminProductSchema } from "@/lib/validators/catalog-f10";
import {
  AdminQueryError,
  ProductConflictError,
  ProductNotFoundError,
  updateAdminProduct,
} from "@/lib/services/admin-product.service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdminModule(request, SystemModule.PRODUCTS, "edit");
    const { id } = await params;
    const body = patchAdminProductSchema.parse(await request.json());
    const updated = await updateAdminProduct({
      id,
      input: body,
      adminUserId: session.sub,
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
    });
    return ok(updated);
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError(err.message, err.status);
    }
    if (err instanceof ProductNotFoundError) {
      return apiError(err.message, 404);
    }
    if (err instanceof AdminQueryError) {
      return apiError(err.message, 400, err.details);
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

export async function DELETE() {
  return methodNotAllowedDeleteProduct("GET, PATCH", "admin");
}

export async function GET() {
  return NextResponse.json(
    { error: "Usa GET /api/admin/products" },
    { status: 405, headers: { Allow: "PATCH" } }
  );
}
