import { describe, expect, it } from "vitest";
import { isProviderSubNavCurrent, providerSubNavTabs } from "@/lib/provider/subnav";
import { canPublishPrice, needsPriceToActivate } from "@/lib/catalog/activate-price";
import { barHeight, chartMax, seriesToTrendPoints, sourceToMixPoints } from "@/lib/reports/unified-chart";
import { defaultHoursDraft, hoursRowError, toOpeningHoursPayload } from "@/lib/provider/hours-editor";
import { safeHttpHref } from "@/lib/provider/safe-http-href";
import { providerReportPdfRangeUrl } from "@/lib/api/provider-ops";
import { MOVEMENT_KIND_LABEL, parseAdjustmentDelta, shrinkageReasonLabel } from "@/lib/inventory/movements-ui";

describe("F14 subnav", () => {
  it("deja Perfil siempre al final, después de Reportes generales si N>1", () => {
    const one = providerSubNavTabs(false).map((t) => t.label);
    expect(one.at(-1)).toBe("Perfil");
    expect(one).not.toContain("Reportes generales");
    const many = providerSubNavTabs(true).map((t) => t.label);
    expect(many).toEqual([
      "Inventario",
      "Catálogo",
      "POS",
      "Órdenes",
      "Ventas",
      "Reportes generales",
      "Perfil",
    ]);
  });

  it("no marca Catálogo activo en /proveedor/perfil", () => {
    expect(isProviderSubNavCurrent("/proveedor/perfil", "/proveedor")).toBe(false);
    expect(isProviderSubNavCurrent("/proveedor/perfil", "/proveedor/perfil")).toBe(true);
    expect(isProviderSubNavCurrent("/proveedor", "/proveedor")).toBe(true);
  });
});

describe("F14 precio al publicar", () => {
  it("exige diálogo si se activa sin precio > 0 y nunca usa 50", () => {
    expect(needsPriceToActivate(null, true)).toBe(true);
    expect(needsPriceToActivate(0, true)).toBe(true);
    expect(needsPriceToActivate(12.5, true)).toBe(false);
    expect(needsPriceToActivate(null, false)).toBe(false);
    expect(canPublishPrice(50)).toBe(true);
    expect(canPublishPrice(0)).toBe(false);
  });
});

describe("F14 UnifiedProviderChart helpers", () => {
  it("no divide entre cero cuando max=0", () => {
    expect(chartMax([])).toBe(0);
    expect(chartMax([{ key: "a", label: "a", value: 0 }])).toBe(0);
    expect(barHeight(10, 0)).toBe(0);
    expect(barHeight(5, 10)).toBe(70);
  });

  it("mapea series y mix de canal", () => {
    const trend = seriesToTrendPoints([{ bucket: "2026-09-01", gmv: "100.00", orderCount: 2 }]);
    expect(trend[0]?.value).toBe(100);
    const mix = sourceToMixPoints({
      MARKETPLACE: { gmv: "10.00", orderCount: 1 },
      POS: { gmv: "20.00", orderCount: 3 },
    });
    expect(mix.map((p) => p.key)).toEqual(["MARKETPLACE", "POS"]);
  });
});

describe("F14 horarios", () => {
  it("rellena 7 días y valida apertura < cierre", () => {
    const draft = defaultHoursDraft(null);
    expect(draft).toHaveLength(7);
    expect(hoursRowError({ day: 1, open: "18:00", close: "08:00", closed: false })).toMatch(/antes/);
    expect(hoursRowError({ day: 1, open: null, close: null, closed: true })).toBe("");
    const payload = toOpeningHoursPayload([{ day: 1, open: "08:00", close: "18:00", closed: true }]);
    expect(payload[0]).toEqual({ day: 1, open: null, close: null, closed: true });
  });
});

describe("F14 PDF from/to", () => {
  it("arma query from/to sin grain", () => {
    const url = providerReportPdfRangeUrl("2026-09-01", "2026-09-12");
    expect(url).toBe("/api/provider/reports.pdf?from=2026-09-01&to=2026-09-12");
    expect(url).not.toContain("grain");
  });
});

describe("F14 movimientos UI", () => {
  it("expone copy SIN ventas y delta de conteo", () => {
    expect(MOVEMENT_KIND_LABEL.MERMA).toBe("Merma");
    expect(shrinkageReasonLabel("CADUCIDAD")).toBe("Caducidad");
    expect(parseAdjustmentDelta(5, 8)).toBe(-3);
    expect(parseAdjustmentDelta(0, 2)).toBe(-2);
  });
});

describe("F14 href Google Maps", () => {
  it("solo admite http(s) y rechaza javascript:", () => {
    expect(safeHttpHref("https://maps.google.com/?q=mty")).toBe("https://maps.google.com/?q=mty");
    expect(safeHttpHref("javascript:alert(1)")).toBeNull();
    expect(safeHttpHref("not a url")).toBeNull();
  });
});
