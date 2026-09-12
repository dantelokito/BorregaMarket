import { NextRequest } from "next/server";
import { applyActiveProviderCookie, requireActiveProvider } from "@/lib/auth/active-provider";
import { ok } from "@/lib/api/response";
import { handleOrderRouteError } from "@/lib/orders/http";
import { getProviderReport, getProviderReportRange } from "@/lib/services/dashboard.service";
import { parseReportsRequest } from "@/lib/validators/report";

/** Proveedor: reporte grain F6 o rango from/to F10 de la sucursal activa */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireActiveProvider(request);
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
        userId: ctx.session.sub,
        providerId: ctx.provider.id,
        from: query.from,
        to: query.to,
        productIds: query.productIds,
      });
      return applyActiveProviderCookie(ok(data), ctx.provider.id);
    }
    const data = await getProviderReport({
      userId: ctx.session.sub,
      providerId: ctx.provider.id,
      grain: query.grain,
      date: query.date,
    });
    return applyActiveProviderCookie(ok(data), ctx.provider.id);
  } catch (err) {
    return handleOrderRouteError(err);
  }
}
