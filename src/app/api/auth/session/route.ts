import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { ok, apiError } from "@/lib/api/response";
import { getAuthSessionPayload } from "@/lib/services/session.service";

/** Hidratar tema de sesión. Siempre 200 (invitado incluido). */
export async function GET(request: NextRequest) {
  try {
    const data = await getAuthSessionPayload(getSession(request));
    const response = ok(data);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch {
    return apiError("Error interno", 500);
  }
}
