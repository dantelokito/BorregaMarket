import { NextRequest, NextResponse } from "next/server";
import { requireActiveProvider } from "@/lib/auth/active-provider";
import { handleOrderRouteError } from "@/lib/orders/http";
import { getProviderReport } from "@/lib/services/dashboard.service";
import { renderProviderReportPdf, reportPdfFilename } from "@/lib/reports/pdf";
import { parseReportQuery } from "@/lib/validators/report";

/** Proveedor: mismo reporte en PDF adjunto (ADR-023) */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireActiveProvider(request);
    const search = new URL(request.url).searchParams;
    const query = parseReportQuery({
      grain: search.get("grain"),
      date: search.get("date"),
    });
    const report = await getProviderReport({
      userId: ctx.session.sub,
      providerId: ctx.provider.id,
      grain: query.grain,
      date: query.date,
    });
    const pdf = await renderProviderReportPdf(report);
    const filename = reportPdfFilename(
      report.provider.businessName,
      report.period.grain ?? "month",
      report.period.date ?? report.period.from
    );
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return handleOrderRouteError(err);
  }
}
