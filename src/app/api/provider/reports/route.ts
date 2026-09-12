import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { getSession, requireRole } from "@/lib/auth/session";
import { ok } from "@/lib/api/response";
import { handleOrderRouteError } from "@/lib/orders/http";
import { getProviderReport, getProviderReportRange } from "@/lib/services/dashboard.service";
import { parseReportsRequest } from "@/lib/validators/report";

/** Proveedor: reporte grain F6 o rango from/to F10 */
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
    if (query.mode === "range") {
      const data = await getProviderReportRange({
        userId: session.sub,
        from: query.from,
        to: query.to,
        productIds: query.productIds,
      });
      return ok(data);
    }
    const data = await getProviderReport({
      userId: session.sub,
      grain: query.grain,
      date: query.date,
    });
    return ok(data);
  } catch (err) {
    return handleOrderRouteError(err);
  }
}
