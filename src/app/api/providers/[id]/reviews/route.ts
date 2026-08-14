import { NextRequest, NextResponse } from "next/server";
import { apiError, handleRouteError } from "@/lib/api/response";
import { parsePaginationParams } from "@/lib/services/pagination";
import {
  listProviderReviews,
  ReviewNotFoundError,
} from "@/lib/services/review.service";
import { ProviderNotFoundError } from "@/lib/services/provider.service";

function parseStrictPage(searchParams: URLSearchParams) {
  const pageRaw = searchParams.get("page");
  const limitRaw = searchParams.get("limit");
  if (pageRaw !== null && pageRaw !== "" && !/^[1-9]\d*$/.test(pageRaw)) {
    return { error: { field: "page", message: "Valor no permitido" } as const };
  }
  if (limitRaw !== null && limitRaw !== "" && !/^[1-9]\d*$/.test(limitRaw)) {
    return { error: { field: "limit", message: "Valor no permitido" } as const };
  }
  return { error: null };
}

/** Público: reseñas del negocio */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const strict = parseStrictPage(searchParams);
    if (strict.error) {
      return apiError("Validation failed", 400, [strict.error]);
    }
    const { page, limit, skip } = parsePaginationParams(searchParams, {
      defaultLimit: 10,
      maxLimit: 50,
    });
    const result = await listProviderReviews({
      providerId: id,
      page,
      limit,
      skip,
    });
    return NextResponse.json({ data: result.data, meta: result.meta });
  } catch (err) {
    if (err instanceof ReviewNotFoundError || err instanceof ProviderNotFoundError) {
      return apiError(err.message === "Reseña no encontrada" ? "Frutería no encontrada" : err.message, 404);
    }
    return handleRouteError(err);
  }
}
