import { NextRequest } from "next/server";
import { UserRole, ProductCategory } from "@prisma/client";
import { getSession, requireRole, AuthError } from "@/lib/auth/session";
import { ok, paginated, apiError, handleRouteError } from "@/lib/api/response";
import { parsePaginationParams } from "@/lib/services/pagination";
import { geoListQuerySchema } from "@/lib/validators/geo";
import {
  createProvider,
  createProviderSchema,
  listProviders,
  ProviderConflictError,
} from "@/lib/services/provider.service";

const CATEGORIES = new Set<string>(Object.values(ProductCategory));

/** API pública: listar fruterías para la vista tipo Airbnb */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePaginationParams(searchParams, {
      defaultLimit: 20,
      maxLimit: 50,
    });

    const q = searchParams.get("q");
    if (q !== null && q.length > 0 && q.length < 2) {
      return apiError("Validation failed", 400, [
        { field: "q", message: "Mínimo 2 caracteres" },
      ]);
    }

    const categoryParam = searchParams.get("category");
    if (categoryParam !== null && categoryParam !== "" && !CATEGORIES.has(categoryParam)) {
      return apiError("Validation failed", 400, [
        { field: "category", message: "Debe ser FRUTA, VERDURA o AGRICOLA" },
      ]);
    }

    const verifiedParam = searchParams.get("verified");
    const verified = verifiedParam === "true";

    const geoQuery = geoListQuerySchema.parse({
      lat: searchParams.get("lat"),
      lng: searchParams.get("lng"),
      radiusKm: searchParams.get("radiusKm"),
    });

    const result = await listProviders(
      {
        city: searchParams.get("city"),
        q: q && q.length >= 2 ? q : null,
        verified,
        category: categoryParam
          ? (categoryParam as "FRUTA" | "VERDURA" | "AGRICOLA")
          : null,
        geo: geoQuery.geo,
      },
      { page, limit, skip }
    );

    return paginated(result.data, result.meta);
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError(err.message, err.status);
    }
    return handleRouteError(err);
  }
}

/** Onboarding proveedor paso 2 — crear entidad Provider */
export async function POST(request: NextRequest) {
  try {
    const session = requireRole(getSession(request), UserRole.PROVIDER);
    const body = createProviderSchema.parse(await request.json());

    const provider = await createProvider(
      session.sub,
      body,
      request.headers.get("x-forwarded-for") ?? undefined
    );

    return ok(
      {
        id: provider.id,
        businessName: provider.businessName,
        address: provider.address,
        city: provider.city,
        latitude: provider.latitude,
        longitude: provider.longitude,
        phone: provider.phone,
        isVerified: provider.isVerified,
        isActive: provider.isActive,
      },
      201
    );
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError(err.message, err.status);
    }
    if (err instanceof ProviderConflictError) {
      return apiError(err.message, 409);
    }
    return handleRouteError(err);
  }
}
