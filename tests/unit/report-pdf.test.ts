import { describe, expect, it } from "vitest";
import type { ProviderReport } from "@/lib/api/types";
import { renderProviderReportPdf, reportPdfFilename } from "@/lib/reports/pdf";

const emptyReport: ProviderReport = {
  empty: true,
  timezone: "America/Monterrey",
  generatedAt: "2026-08-16T23:41:00.000Z",
  provider: { id: "clx1", businessName: "Frutas El Paraíso" },
  period: {
    grain: "day",
    date: "2026-08-10",
    from: "2026-08-10T06:00:00.000Z",
    to: "2026-08-11T06:00:00.000Z",
  },
  kpis: {
    gmv: "0.00",
    avgTicket: "0.00",
    orderCount: 0,
    bySource: {
      MARKETPLACE: { gmv: "0.00", orderCount: 0 },
      POS: { gmv: "0.00", orderCount: 0 },
    },
  },
  series: [],
  topProducts: [],
};

describe("renderProviderReportPdf", () => {
  it("builds a kebab filename from the business name", () => {
    expect(reportPdfFilename("Frutas El Paraíso", "month", "2026-08")).toBe(
      "reporte-frutas-el-paraiso-month-2026-08.pdf"
    );
  });

  it("returns a valid PDF buffer for an empty period", async () => {
    const pdf = await renderProviderReportPdf(emptyReport);
    expect(pdf.subarray(0, 4).toString("utf8")).toBe("%PDF");
    expect(pdf.length).toBeGreaterThan(100);
  });
});
