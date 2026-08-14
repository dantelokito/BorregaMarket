import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { getSession, requireRole } from "@/lib/auth/session";
import { ok } from "@/lib/api/response";
import { handleOrderRouteError } from "@/lib/orders/http";
import { getProviderDashboard } from "@/lib/services/dashboard.service";
import { dashboardQuerySchema } from "@/lib/validators/order";

/** Proveedor: KPIs ilustrativos de ventas */
export async function GET(request: NextRequest) {
  try {
    const session = requireRole(getSession(request), UserRole.PROVIDER);
    dashboardQuerySchema.parse({
      range: new URL(request.url).searchParams.get("range") ?? undefined,
    });
    const data = await getProviderDashboard({ userId: session.sub });
    return ok(data);
  } catch (err) {
    return handleOrderRouteError(err);
  }
}
