import { NextRequest } from "next/server";
import { SystemModule } from "@prisma/client";
import { AuthError } from "@/lib/auth/session";
import { requireAdminModule } from "@/lib/auth/require-admin-module";
import { ok, apiError, handleRouteError } from "@/lib/api/response";
import {
  uploadProductImage,
  MediaValidationError,
  MediaNotFoundError,
  DiskStorageError,
} from "@/lib/services/media.service";

/** ADMIN: upload imagen de producto de catálogo */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdminModule(request, SystemModule.PRODUCTS, "edit");
    const { id } = await params;

    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return apiError("Validation failed", 400, [
        { field: "file", message: "Archivo requerido" },
      ]);
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;

    const result = await uploadProductImage({
      productId: id,
      adminUserId: session.sub,
      file,
      ipAddress: ip,
    });

    return ok(result);
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError(err.message, err.status);
    }
    if (err instanceof MediaValidationError) {
      return apiError("Validation failed", 400, [
        { field: err.field, message: err.message },
      ]);
    }
    if (err instanceof MediaNotFoundError) {
      return apiError(err.message, 404);
    }
    if (err instanceof DiskStorageError) {
      return apiError(err.message, 500);
    }
    return handleRouteError(err);
  }
}
