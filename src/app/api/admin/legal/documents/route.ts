import { NextRequest } from "next/server";
import { SystemModule } from "@prisma/client";
import { AuthError } from "@/lib/auth/session";
import { requireAdminModule } from "@/lib/auth/require-admin-module";
import { ok, paginated, apiError, handleRouteError } from "@/lib/api/response";
import { parsePaginationParams } from "@/lib/services/pagination";
import {
  createLegalDocumentSchema,
  legalDocumentTypeQuerySchema,
} from "@/lib/validators/legal";
import {
  LegalVersionConflictError,
  listLegalDocuments,
  publishLegalDocument,
} from "@/lib/services/legal.service";

/** API-LEGAL-05 */
export async function GET(request: NextRequest) {
  try {
    await requireAdminModule(request, SystemModule.LEGAL, "view");
    const { searchParams } = new URL(request.url);
    const typeCheck = legalDocumentTypeQuerySchema.safeParse(searchParams.get("type"));
    if (!typeCheck.success) {
      return apiError("Validation failed", 400, [
        { field: "type", message: "Debe ser PRIVACY, TERMS o COOKIES" },
      ]);
    }
    const pagination = parsePaginationParams(searchParams, { defaultLimit: 20, maxLimit: 50 });
    const result = await listLegalDocuments({ type: typeCheck.data }, pagination);
    return paginated(result.data, result.meta);
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError(err.message, err.status);
    }
    return handleRouteError(err);
  }
}

/** API-LEGAL-04: publica una versión nueva (las previas nunca se editan). */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminModule(request, SystemModule.LEGAL, "create");
    const input = createLegalDocumentSchema.parse(await request.json());
    const data = await publishLegalDocument({
      input,
      userId: session.sub,
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
    });
    return ok(data, 201);
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError(err.message, err.status);
    }
    if (err instanceof LegalVersionConflictError) {
      return apiError(err.message, 409);
    }
    if (err instanceof SyntaxError) {
      return apiError("Validation failed", 400, [{ field: "body", message: "JSON inválido" }]);
    }
    return handleRouteError(err);
  }
}
