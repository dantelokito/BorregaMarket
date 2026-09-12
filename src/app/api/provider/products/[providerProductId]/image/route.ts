import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { getSession, requireRole, AuthError } from "@/lib/auth/session";
import { ok, apiError, handleRouteError } from "@/lib/api/response";
import {
  uploadProviderProductImage,
  MediaValidationError,
  MediaNotFoundError,
  MediaForbiddenError,
  DiskStorageError,
} from "@/lib/services/media.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ providerProductId: string }> }
) {
  try {
    const session = requireRole(getSession(request), UserRole.PROVIDER);
    const { providerProductId } = await params;
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return apiError("Validation failed", 400, [
        { field: "file", message: "Archivo requerido" },
      ]);
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;

    const result = await uploadProviderProductImage({
      userId: session.sub,
      providerProductId,
      file,
      ipAddress: ip,
    });
    return ok(result);
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError(err.message, err.status);
    }
    if (err instanceof MediaForbiddenError) {
      return apiError(err.message, 403);
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
