import { NextRequest } from "next/server";
import { applyActiveProviderCookie, requireActiveProvider } from "@/lib/auth/active-provider";
import { ok } from "@/lib/api/response";
import { handleOrderRouteError } from "@/lib/orders/http";
import { getProviderDashboard } from "@/lib/services/dashboard.service";
import { dashboardQuerySchema } from "@/lib/validators/order";

/** Proveedor: KPIs ilustrativos de ventas */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireActiveProvider(request);
    dashboardQuerySchema.parse({
      range: new URL(request.url).searchParams.get("range") ?? undefined,
    });
    const data = await getProviderDashboard({
      userId: ctx.session.sub,
      providerId: ctx.provider.id,
    });
    return applyActiveProviderCookie(ok(data), ctx.provider.id);
  } catch (err) {
    return handleOrderRouteError(err);
  }
}
