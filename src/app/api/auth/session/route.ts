import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { readActiveProviderCookie, applyActiveProviderCookie } from "@/lib/auth/active-provider";
import { ok, apiError } from "@/lib/api/response";
import { resolveAuthSession } from "@/lib/services/session.service";
import { getPendingConsents } from "@/lib/services/legal.service";

async function pendingConsentsFor(userId: string | null) {
  if (!userId) return [];
  try {
    return await getPendingConsents(userId);
  } catch (err) {
    console.warn("[legal] pending_consents_failed", err);
    return [];
  }
}

/** Hidratar tema de sesión y sucursal activa. Siempre 200 (invitado incluido). */
export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    const resolved = await resolveAuthSession(session, readActiveProviderCookie(request));
    const pendingConsents = await pendingConsentsFor(
      resolved.payload.authenticated ? session?.sub ?? null : null
    );
    const response = ok({ ...resolved.payload, pendingConsents });
    response.headers.set("Cache-Control", "private, no-store");
    if (resolved.cookieProviderId) {
      applyActiveProviderCookie(response, resolved.cookieProviderId);
    }
    return response;
  } catch {
    return apiError("Error interno", 500);
  }
}
