import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { getSession, requireRole, AuthError } from "@/lib/auth/session";
import { paginated, apiError, handleRouteError } from "@/lib/api/response";
import { parsePaginationParams } from "@/lib/services/pagination";
import { listAdminProviders } from "@/lib/services/provider.service";

/** Admin: listar proveedores para verificación */
export async function GET(request: NextRequest) {
  try {
    requireRole(getSession(request), UserRole.ADMIN);
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePaginationParams(searchParams, {
      defaultLimit: 20,
      maxLimit: 50,
    });

    const verifiedParam = searchParams.get("verified");
    const verified =
      verifiedParam === "true" ? true : verifiedParam === "false" ? false : undefined;

    const result = await listAdminProviders({ verified }, { page, limit, skip });
    return paginated(result.data, result.meta);
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError(err.message, err.status);
    }
    return handleRouteError(err);
  }
}
