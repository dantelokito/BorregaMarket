import { NextRequest } from "next/server";
import { AuthError } from "@/lib/auth/session";
import { applyActiveProviderCookie, requireActiveProvider } from "@/lib/auth/active-provider";
import { ok, apiError, handleRouteError } from "@/lib/api/response";
import {
  uploadProviderMedia,
  MediaValidationError,
  MediaNotFoundError,
  DiskStorageError,
} from "@/lib/services/media.service";

const MEDIA_FIELDS = new Set(["logo", "cover"]);

/** PROVIDER: upload logo o cover (multipart) */
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireActiveProvider(request);

    const form = await request.formData();
    const file = form.get("file");
    const fieldRaw = form.get("field");

    if (!(file instanceof File) || file.size === 0) {
      return apiError("Validation failed", 400, [
        { field: "file", message: "Archivo requerido" },
      ]);
    }

    if (typeof fieldRaw !== "string" || !MEDIA_FIELDS.has(fieldRaw)) {
      return apiError("Validation failed", 400, [
        { field: "field", message: "Debe ser logo o cover" },
      ]);
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;

    const result = await uploadProviderMedia({
      userId: ctx.session.sub,
      providerId: ctx.provider.id,
      field: fieldRaw as "logo" | "cover",
      file,
      ipAddress: ip,
    });

    return applyActiveProviderCookie(ok(result), ctx.provider.id);
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
