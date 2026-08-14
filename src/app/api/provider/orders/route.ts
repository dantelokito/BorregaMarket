import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { getSession, requireRole } from "@/lib/auth/session";
import { paginated } from "@/lib/api/response";
import { parsePaginationParams } from "@/lib/services/pagination";
import { handleOrderRouteError } from "@/lib/orders/http";
import { listProviderOrders } from "@/lib/services/order.service";
import { providerOrdersQuerySchema } from "@/lib/validators/order";

/** Proveedor: órdenes de su negocio (tabs activas / completadas / canceladas) */
export async function GET(request: NextRequest) {
  try {
    const session = requireRole(getSession(request), UserRole.PROVIDER);
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePaginationParams(searchParams, {
      defaultLimit: 20,
      maxLimit: 50,
    });
    const query = providerOrdersQuerySchema.parse({
      tab: searchParams.get("tab") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      source: searchParams.get("source") ?? undefined,
    });
    const result = await listProviderOrders({
      userId: session.sub,
      page,
      limit,
      skip,
      tab: query.tab,
      status: query.status,
      source: query.source,
    });
    return paginated(result.data, result.meta);
  } catch (err) {
    return handleOrderRouteError(err);
  }
}
