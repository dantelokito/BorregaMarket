import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";

const getSession = vi.fn();
const listOwnedProviders = vi.fn();
const findOwnedProvider = vi.fn();
const getGlobalProviderReport = vi.fn();
const listProviderSections = vi.fn();

vi.mock("@/lib/auth/session", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/session")>(
    "@/lib/auth/session"
  );
  return { ...actual, getSession: (...args: unknown[]) => getSession(...args) };
});

vi.mock("@/lib/providers/owned-provider", () => ({
  listOwnedProviders: (...args: unknown[]) => listOwnedProviders(...args),
  findOwnedProvider: (...args: unknown[]) => findOwnedProvider(...args),
}));

vi.mock("@/lib/audit", () => ({
  writeAuditLog: vi.fn().mockResolvedValue("a1"),
}));

vi.mock("@/lib/services/dashboard.service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/dashboard.service")>(
    "@/lib/services/dashboard.service"
  );
  return {
    ...actual,
    getGlobalProviderReport: (...args: unknown[]) => getGlobalProviderReport(...args),
  };
});

vi.mock("@/lib/services/section.service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/section.service")>(
    "@/lib/services/section.service"
  );
  return {
    ...actual,
    listProviderSections: (...args: unknown[]) => listProviderSections(...args),
  };
});

import { GET as getMine } from "@/app/api/provider/mine/route";
import { POST as postActive } from "@/app/api/provider/active/route";
import { GET as getGlobal } from "@/app/api/provider/reports/global/route";
import { GET as getSections } from "@/app/api/provider/sections/route";
import { GlobalReportsNotAvailableError } from "@/lib/services/dashboard.service";
import { CatalogForbiddenError } from "@/lib/services/local-product.service";

function jsonRequest(
  url: string,
  options: { method?: string; body?: unknown; cookie?: string } = {}
) {
  return new NextRequest(new URL(url, "http://localhost:8080"), {
    method: options.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...(options.cookie ? { cookie: options.cookie } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

const providerSession = {
  sub: "u-paraiso",
  role: UserRole.PROVIDER,
  email: "frutas@elparaiso.mx",
  name: "Carlos",
};

const centro = {
  id: "clxcentro000000000000001",
  userId: "u-paraiso",
  businessName: "Frutas El Paraíso",
  address: "Av. Constitución 1200, Centro, Monterrey",
  isActive: true,
  primaryColor: null,
  secondaryColor: null,
};
const tec = {
  id: "clxtecno0000000000000002",
  userId: "u-paraiso",
  businessName: "El Paraíso Tecnológico",
  address: "Av. Eugenio Garza Sada 2501, Tecnológico, Monterrey",
  isActive: true,
  primaryColor: null,
  secondaryColor: null,
};

describe("F11 AUTH / ISO / DASH global", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listOwnedProviders.mockResolvedValue([centro, tec]);
    findOwnedProvider.mockImplementation(async (_userId: string, id?: string) => {
      if (id === centro.id) return centro;
      if (id === tec.id) return tec;
      return null;
    });
  });

  it("GET /api/provider/mine returns 401 without JWT", async () => {
    getSession.mockReturnValue(null);
    const res = await getMine(jsonRequest("/api/provider/mine"));
    expect(res.status).toBe(401);
  });

  it("GET /api/provider/mine returns 403 for CLIENT", async () => {
    getSession.mockReturnValue({
      sub: "c1",
      role: UserRole.CLIENT,
      email: "c@test.com",
      name: "María",
    });
    const res = await getMine(jsonRequest("/api/provider/mine"));
    expect(res.status).toBe(403);
  });

  it("GET /api/provider/mine lists both sucursales", async () => {
    getSession.mockReturnValue(providerSession);
    const res = await getMine(jsonRequest("/api/provider/mine"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.providerCount).toBe(2);
    expect(body.data.providers).toHaveLength(2);
  });

  it("POST /api/provider/active returns 403 for alien or unknown id", async () => {
    getSession.mockReturnValue(providerSession);
    const res = await postActive(
      jsonRequest("/api/provider/active", {
        method: "POST",
        body: { providerId: "clxajeno00000000000000099" },
      })
    );
    expect(res.status).toBe(403);
  });

  it("POST /api/provider/active ignores X-Active-Provider-Id header", async () => {
    getSession.mockReturnValue(providerSession);
    const req = new NextRequest(new URL("/api/provider/active", "http://localhost:8080"), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-active-provider-id": tec.id,
      },
      body: JSON.stringify({ providerId: centro.id }),
    });
    const res = await postActive(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.activeProviderId).toBe(centro.id);
  });

  it("GET /api/provider/reports/global returns 403 GLOBAL_REPORTS_NOT_AVAILABLE if N=1", async () => {
    getSession.mockReturnValue(providerSession);
    getGlobalProviderReport.mockRejectedValue(new GlobalReportsNotAvailableError());
    const res = await getGlobal(
      jsonRequest("/api/provider/reports/global?from=2026-09-01&to=2026-09-12")
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("GLOBAL_REPORTS_NOT_AVAILABLE");
    expect(res.status).not.toBe(404);
  });

  it("GET /api/provider/sections returns 403 when service detects IDOR vs active", async () => {
    getSession.mockReturnValue(providerSession);
    listProviderSections.mockRejectedValue(new CatalogForbiddenError());
    const res = await getSections(
      jsonRequest("/api/provider/sections", {
        cookie: `lbm_active_provider=${centro.id}`,
      })
    );
    expect(res.status).toBe(403);
  });
});
