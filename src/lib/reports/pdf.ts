import PDFDocument from "pdfkit";
import type { ProviderReport } from "@/lib/api/types";
import { DASHBOARD_TZ } from "@/lib/timezone";

function slugifyBusinessName(businessName: string): string {
  return (
    businessName
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "negocio"
  );
}

export function reportPdfFilename(
  businessName: string,
  grain: string,
  date: string
): string {
  return `reporte-${slugifyBusinessName(businessName)}-${grain}-${date}.pdf`;
}

export function reportPdfRangeFilename(
  businessName: string,
  from: string,
  to: string
): string {
  return `reporte-${slugifyBusinessName(businessName)}-${from}_${to}.pdf`;
}

function formatGeneratedAt(iso: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: DASHBOARD_TZ,
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(iso));
}

export function renderProviderReportPdf(report: ProviderReport): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(16).text(report.provider.businessName);
    doc.moveDown(0.4);
    doc.fontSize(11).text(
      `Periodo: ${report.period.grain ?? report.period.mode} ${report.period.date ?? `${report.period.from}–${report.period.to}`}`
    );
    doc.text(`Zona horaria: ${report.timezone}`);
    doc.text(`Generado: ${formatGeneratedAt(report.generatedAt)}`);
    doc.moveDown();

    if (report.empty) {
      doc.fontSize(12).text("Sin ventas en este periodo.");
    }

    doc.fontSize(12).text("Indicadores");
    doc.fontSize(10);
    doc.text(`GMV: ${report.kpis.gmv}`);
    doc.text(`Ticket promedio: ${report.kpis.avgTicket}`);
    doc.text(`Órdenes: ${report.kpis.orderCount}`);
    doc.moveDown(0.5);
    doc.text(
      `Encargar (MARKETPLACE): ${report.kpis.bySource.MARKETPLACE.gmv} / ${report.kpis.bySource.MARKETPLACE.orderCount} órdenes`
    );
    doc.text(
      `Mostrador (POS): ${report.kpis.bySource.POS.gmv} / ${report.kpis.bySource.POS.orderCount} órdenes`
    );

    if (report.series.length > 0) {
      doc.moveDown();
      doc.fontSize(12).text("Serie");
      doc.fontSize(9);
      for (const point of report.series) {
        doc.text(`${point.bucket}  GMV ${point.gmv}  Órdenes ${point.orderCount}`);
      }
    }

    doc.moveDown();
    doc.fontSize(12).text("Top productos");
    doc.fontSize(9);
    const productRows = report.products ?? report.topProducts ?? [];
    if (productRows.length === 0) {
      doc.text("Sin productos en el periodo.");
    } else {
      for (const product of productRows) {
        doc.text(
          `${product.name}  ${product.salesTotal}  cant. ${product.quantitySum}`
        );
      }
    }

    doc.end();
  });
}
