import { NextRequest } from "next/server";
import { ok, apiError, handleRouteError } from "@/lib/api/response";
import { etaQuerySchema } from "@/lib/validators/geo";
import {
  getProviderEta,
  ProviderNotFoundError,
  ProviderSettingsValidationError,
} from "@/lib/services/provider.service";

/** Público: preview ETA (ADR-017), no persiste */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const query = etaQuerySchema.parse({
      lat: searchParams.get("lat"),
      lng: searchParams.get("lng"),
      fulfillmentType: searchParams.get("fulfillmentType") ?? undefined,
    });
    const data = await getProviderEta({
      providerId: id,
      lat: query.lat,
      lng: query.lng,
      fulfillmentType: query.fulfillmentType,
    });
    return ok(data);
  } catch (err) {
    if (err instanceof ProviderNotFoundError) {
      return apiError(err.message, 404);
    }
    if (err instanceof ProviderSettingsValidationError) {
      return apiError(err.message, 400, err.details);
    }
    return handleRouteError(err);
  }
}
