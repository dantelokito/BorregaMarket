import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { readActiveProviderCookie, applyActiveProviderCookie } from "@/lib/auth/active-provider";
import { ok, apiError } from "@/lib/api/response";
import { resolveAuthSession } from "@/lib/services/session.service";

/** Hidratar tema de sesión y sucursal activa. Siempre 200 (invitado incluido). */
export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveAuthSession(
      getSession(request),
      readActiveProviderCookie(request)
    );
    const response = ok(resolved.payload);
    response.headers.set("Cache-Control", "private, no-store");
    if (resolved.cookieProviderId) {
      applyActiveProviderCookie(response, resolved.cookieProviderId);
    }
    return response;
  } catch {
    return apiError("Error interno", 500);
  }
}
