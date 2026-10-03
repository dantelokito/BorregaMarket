import { NextRequest } from "next/server";
import { SystemModule } from "@prisma/client";
import { AuthError } from "@/lib/auth/session";
import { requireAdminModule } from "@/lib/auth/require-admin-module";
import { ok, apiError, handleRouteError } from "@/lib/api/response";
import { putLegalSettingsSchema } from "@/lib/validators/legal";
import { getAdminLegalSettings, updateLegalSettings } from "@/lib/services/legal.service";

/** API-LEGAL-02 */
export async function GET(request: NextRequest) {
  try {
    await requireAdminModule(request, SystemModule.LEGAL, "view");
    return ok(await getAdminLegalSettings());
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError(err.message, err.status);
    }
    return apiError("Error interno", 500);
  }
}

/** API-LEGAL-03 */
export async function PUT(request: NextRequest) {
  try {
    const session = await requireAdminModule(request, SystemModule.LEGAL, "edit");
    const input = putLegalSettingsSchema.parse(await request.json());
    const data = await updateLegalSettings({
      input,
      userId: session.sub,
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
    });
    return ok(data);
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError(err.message, err.status);
    }
    if (err instanceof SyntaxError) {
      return apiError("Validation failed", 400, [{ field: "body", message: "JSON inválido" }]);
    }
    return handleRouteError(err);
  }
}
