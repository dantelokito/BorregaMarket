import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { getSession, requireRole, AuthError } from "@/lib/auth/session";
import { ok, apiError, handleRouteError } from "@/lib/api/response";
import { analyticsRangeSchema } from "@/lib/validators/analytics";
import { getAdminAnalytics } from "@/lib/services/admin-analytics.service";

/** Admin: KPIs de plataforma (distinto del dashboard de un proveedor) */
export async function GET(request: NextRequest) {
  try {
    requireRole(getSession(request), UserRole.ADMIN);
    const { searchParams } = new URL(request.url);
    const { range } = analyticsRangeSchema.parse({
      range: searchParams.get("range") ?? undefined,
    });
    const data = await getAdminAnalytics({ range });
    return ok(data);
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError(err.message, err.status);
    }
    return handleRouteError(err);
  }
}
