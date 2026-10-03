import { ok, apiError } from "@/lib/api/response";
import { getLegalCurrentPayload } from "@/lib/services/legal.service";

export const dynamic = "force-dynamic";

/** API-LEGAL-01: datos públicos del responsable + versiones vigentes. Sin caché. */
export async function GET() {
  try {
    const response = ok(await getLegalCurrentPayload());
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return apiError("Error interno", 500);
  }
}
