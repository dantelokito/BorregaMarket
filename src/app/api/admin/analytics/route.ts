import { NextRequest } from "next/server";
import { SystemModule } from "@prisma/client";
import { AuthError } from "@/lib/auth/session";
import { requireAdminModule } from "@/lib/auth/require-admin-module";
import { ok, apiError, handleRouteError } from "@/lib/api/response";
import { analyticsRangeSchema } from "@/lib/validators/analytics";
import { getAdminAnalytics } from "@/lib/services/admin-analytics.service";

/** Admin: KPIs de plataforma (distinto del dashboard de un proveedor) */
export async function GET(request: NextRequest) {
  try {
    await requireAdminModule(request, SystemModule.ORDERS, "view");
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
