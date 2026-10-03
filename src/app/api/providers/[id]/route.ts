import { NextRequest } from "next/server";
import { ok, apiError } from "@/lib/api/response";
import {
  getProviderDetail,
  ProviderNotFoundError,
} from "@/lib/services/provider.service";
import { cachedProviderDetail } from "@/lib/cache/public-cache";

/** API pública: detalle de frutería con productos activos (caché ADR-043, no lee sesión) */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { body, status } = await cachedProviderDetail(id, () => getProviderDetail(id));
    const response = ok(body);
    response.headers.set("X-Cache", status);
    return response;
  } catch (err) {
    if (err instanceof ProviderNotFoundError) {
      return apiError(err.message, 404);
    }
    return apiError("Error interno", 500);
  }
}
