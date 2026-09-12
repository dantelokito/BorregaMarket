import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import type { ProviderReport } from "@/lib/api/types";

const getSession = vi.fn();
const getProviderReport = vi.fn();
const renderProviderReportPdf = vi.fn();

vi.mock("@/lib/auth/session", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/session")>(
    "@/lib/auth/session"
  );
  return {
    ...actual,
    getSession: (...args: unknown[]) => getSession(...args),
  };
});

vi.mock("@/lib/services/dashboard.service", () => ({
  getProviderReport: (...args: unknown[]) => getProviderReport(...args),
  getProviderReportRange: vi.fn(),
}));

vi.mock("@/lib/reports/pdf", async () => {
  const actual = await vi.importActual<typeof import("@/lib/reports/pdf")>(
    "@/lib/reports/pdf"
  );
  return {
    ...actual,
    renderProviderReportPdf: (...args: unknown[]) => renderProviderReportPdf(...args),
  };
});

import { GET as getReport } from "@/app/api/provider/reports/route";
import { GET as getReportPdf } from "@/app/api/provider/reports.pdf/route";

function jsonRequest(url: string) {
  return new NextRequest(new URL(url, "http://localhost:8080"));
}

const emptyReport: ProviderReport = {
  empty: true,
  timezone: "America/Monterrey",
  generatedAt: "2026-08-16T23:41:00.000Z",
  provider: { id: "prov1", businessName: "Frutas El Paraíso" },
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

describe("provider reports routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getProviderReport.mockResolvedValue(emptyReport);
    renderProviderReportPdf.mockResolvedValue(Buffer.from("%PDF-1.4 empty"));
  });

  it("returns 401 without session on JSON and PDF", async () => {
    getSession.mockReturnValue(null);
    const json = await getReport(jsonRequest("/api/provider/reports?grain=day&date=2026-08-10"));
    const pdf = await getReportPdf(
      jsonRequest("/api/provider/reports.pdf?grain=day&date=2026-08-10")
    );
    expect(json.status).toBe(401);
    expect(pdf.status).toBe(401);
    expect((await json.json()).error).toBe("No autenticado");
  });

  it("returns 403 for CLIENT and ADMIN", async () => {
    getSession.mockReturnValue({
      sub: "u1",
      email: "c@test.com",
      role: UserRole.CLIENT,
      name: "Ana",
    });
    const client = await getReport(
      jsonRequest("/api/provider/reports?grain=day&date=2026-08-10")
    );
    expect(client.status).toBe(403);

    getSession.mockReturnValue({
      sub: "admin",
      email: "a@test.com",
      role: UserRole.ADMIN,
      name: "Admin",
    });
    const admin = await getReportPdf(
      jsonRequest("/api/provider/reports.pdf?grain=month&date=2026-08")
    );
    expect(admin.status).toBe(403);
  });

  it("returns 400 for invalid grain/date and future periods", async () => {
    getSession.mockReturnValue({
      sub: "u2",
      email: "p@test.com",
      role: UserRole.PROVIDER,
      name: "Carlos",
    });
    const invalid = await getReport(
      jsonRequest("/api/provider/reports?grain=month&date=2026-08-16")
    );
    expect(invalid.status).toBe(400);

    const future = await getReport(
      jsonRequest("/api/provider/reports?grain=day&date=2099-01-01")
    );
    expect(future.status).toBe(400);
    const body = await future.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toEqual([
      { field: "date", message: "El periodo no puede ser futuro" },
    ]);
  });

  it("returns 200 empty JSON for PROVIDER", async () => {
    getSession.mockReturnValue({
      sub: "u2",
      email: "p@test.com",
      role: UserRole.PROVIDER,
      name: "Carlos",
    });
    const res = await getReport(
      jsonRequest("/api/provider/reports?grain=day&date=2026-08-10")
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.empty).toBe(true);
    expect(body.data.kpis.gmv).toBe("0.00");
    expect(body.data.kpis.bySource.MARKETPLACE.orderCount).toBe(0);
    expect(getProviderReport).toHaveBeenCalledWith({
      userId: "u2",
      grain: "day",
      date: "2026-08-10",
    });
  });

  it("returns 200 application/pdf for an empty period", async () => {
    getSession.mockReturnValue({
      sub: "u2",
      email: "p@test.com",
      role: UserRole.PROVIDER,
      name: "Carlos",
    });
    const res = await getReportPdf(
      jsonRequest("/api/provider/reports.pdf?grain=day&date=2026-08-10")
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toBe(
      'attachment; filename="reporte-frutas-el-paraiso-day-2026-08-10.pdf"'
    );
    const bytes = Buffer.from(await res.arrayBuffer());
    expect(bytes.subarray(0, 4).toString("utf8")).toBe("%PDF");
  });
});
