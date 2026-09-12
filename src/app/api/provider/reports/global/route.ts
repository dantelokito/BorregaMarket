import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { getSession, requireRole } from "@/lib/auth/session";
import { ok } from "@/lib/api/response";
import { handleOrderRouteError } from "@/lib/orders/http";
import { OrderValidationError } from "@/lib/orders/errors";
import { getGlobalProviderReport } from "@/lib/services/dashboard.service";
import { parseReportsRequest } from "@/lib/validators/report";

/** Reportes consolidados de todas las sucursales del dueño (N>1). */
export async function GET(request: NextRequest) {
  try {
    const session = requireRole(getSession(request), UserRole.PROVIDER);
    const search = new URL(request.url).searchParams;
    const query = parseReportsRequest({
      grain: search.get("grain"),
      date: search.get("date"),
      from: search.get("from"),
      to: search.get("to"),
      productIds: search.getAll("productIds"),
    });
    if (query.mode !== "range") {
      throw new OrderValidationError("Validation failed", [
        { field: "from", message: "El reporte global Must usa from y to" },
      ]);
    }
    const data = await getGlobalProviderReport({
      userId: session.sub,
      from: query.from,
      to: query.to,
      productIds: query.productIds,
    });
    return ok(data);
  } catch (err) {
    return handleOrderRouteError(err);
  }
}
