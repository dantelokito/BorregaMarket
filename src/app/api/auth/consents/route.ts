import { NextRequest } from "next/server";
import { getSession, AuthError } from "@/lib/auth/session";
import { ok, apiError, handleRouteError } from "@/lib/api/response";
import { postConsentsSchema } from "@/lib/validators/legal";
import {
  acceptConsents,
  LegalUnavailableError,
  LegalVersionError,
} from "@/lib/services/legal.service";

/** API-CONSENT-15-01: re-aceptación de TERMS/PRIVACY vigentes (source RELOGIN). */
export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) throw new AuthError("No autenticado", 401);
    const input = postConsentsSchema.parse(await request.json());
    const pendingConsents = await acceptConsents({
      userId: session.sub,
      documents: input.documents,
    });
    return ok({ pendingConsents }, 201);
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError(err.message, err.status);
    }
    if (err instanceof LegalVersionError) {
      return apiError(err.message, 400, err.details);
    }
    if (err instanceof LegalUnavailableError) {
      return apiError("Documento legal no disponible", 503);
    }
    if (err instanceof SyntaxError) {
      return apiError("Validation failed", 400, [{ field: "body", message: "JSON inválido" }]);
    }
    return handleRouteError(err);
  }
}
