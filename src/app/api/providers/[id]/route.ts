import { NextRequest } from "next/server";
import { ok, apiError } from "@/lib/api/response";
import {
  getProviderDetail,
  ProviderNotFoundError,
} from "@/lib/services/provider.service";

/** API pública: detalle de frutería con productos activos */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await getProviderDetail(id);
    return ok(data);
  } catch (err) {
    if (err instanceof ProviderNotFoundError) {
      return apiError(err.message, 404);
    }
    return apiError("Error interno", 500);
  }
}
