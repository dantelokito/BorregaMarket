import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { AuthError } from "@/lib/auth/session";

const getSession = vi.fn();
const createMarketplaceOrder = vi.fn();
const listClientOrders = vi.fn();
const createPosSale = vi.fn();
const getProviderDashboard = vi.fn();

vi.mock("@/lib/auth/session", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/session")>(
    "@/lib/auth/session"
  );
  return {
    ...actual,
    getSession: (...args: unknown[]) => getSession(...args),
  };
});

vi.mock("@/lib/services/order.service", () => ({
  createMarketplaceOrder: (...args: unknown[]) => createMarketplaceOrder(...args),
  listClientOrders: (...args: unknown[]) => listClientOrders(...args),
}));

vi.mock("@/lib/services/pos.service", () => ({
  createPosSale: (...args: unknown[]) => createPosSale(...args),
}));

vi.mock("@/lib/services/dashboard.service", () => ({
  getProviderDashboard: (...args: unknown[]) => getProviderDashboard(...args),
}));

vi.mock("@/lib/email/resend", () => ({
  sendNewOrderEmail: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("next/server", async () => {
  const actual = await vi.importActual<typeof import("next/server")>("next/server");
  return {
    ...actual,
    after: (fn: () => unknown) => {
      void fn();
    },
  };
});

import { GET as getOrders, POST as postOrders } from "@/app/api/orders/route";
import { POST as postPos } from "@/app/api/provider/pos/sales/route";
import { GET as getDash } from "@/app/api/provider/dashboard/route";

function jsonRequest(
  url: string,
  options: { method?: string; body?: unknown; headers?: Record<string, string> } = {}
) {
  return new NextRequest(new URL(url, "http://localhost:8080"), {
    method: options.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...options.headers,
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

describe("orders routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without session", async () => {
    getSession.mockReturnValue(null);
    const res = await getOrders(jsonRequest("/api/orders"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("No autenticado");
  });

  it("returns 403 when PROVIDER hits CLIENT orders list", async () => {
    getSession.mockReturnValue({
      sub: "u2",
      email: "p@test.com",
      role: UserRole.PROVIDER,
      name: "Carlos",
    });
    const res = await getOrders(jsonRequest("/api/orders"));
    expect(res.status).toBe(403);
  });

  it("requires Idempotency-Key on POST /api/orders", async () => {
    getSession.mockReturnValue({
      sub: "u1",
      email: "c@test.com",
      role: UserRole.CLIENT,
      name: "María",
    });
    const res = await postOrders(
      jsonRequest("/api/orders", {
        method: "POST",
        body: { providerId: "prov1", items: [{ providerProductId: "pp1", quantity: "1" }] },
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(createMarketplaceOrder).not.toHaveBeenCalled();
  });

  it("returns 201 envelope on first marketplace create", async () => {
    getSession.mockReturnValue({
      sub: "u1",
      email: "c@test.com",
      role: UserRole.CLIENT,
      name: "María",
    });
    createMarketplaceOrder.mockResolvedValue({
      replay: false,
      order: { id: "ord1", total: "85.50", status: "PENDING" },
      emailJob: null,
    });
    const res = await postOrders(
      jsonRequest("/api/orders", {
        method: "POST",
        headers: { "Idempotency-Key": "11111111-1111-4111-8111-111111111111" },
        body: {
          providerId: "prov1",
          items: [{ providerProductId: "pp1", quantity: "2" }],
        },
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.id).toBe("ord1");
    expect(body.data.total).toBe("85.50");
  });
});

describe("POS and dashboard routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 on POS without session", async () => {
    getSession.mockReturnValue(null);
    const res = await postPos(
      jsonRequest("/api/provider/pos/sales", {
        method: "POST",
        headers: { "Idempotency-Key": "11111111-1111-4111-8111-111111111111" },
        body: { paymentMethod: "CASH", items: [] },
      })
    );
    expect(res.status).toBe(401);
  });

  it("returns dashboard envelope for PROVIDER", async () => {
    getSession.mockReturnValue({
      sub: "u2",
      email: "p@test.com",
      role: UserRole.PROVIDER,
      name: "Carlos",
    });
    getProviderDashboard.mockResolvedValue({
      kpis: { d1: { salesTotal: "0.00", orderCount: 0 } },
      empty: true,
    });
    const res = await getDash(jsonRequest("/api/provider/dashboard"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.empty).toBe(true);
  });

  it("unused AuthError stays available", () => {
    expect(new AuthError("x", 401).status).toBe(401);
  });

  it("returns 201 on POS sale", async () => {
    getSession.mockReturnValue({
      sub: "u2",
      email: "p@test.com",
      role: UserRole.PROVIDER,
      name: "Carlos",
    });
    createPosSale.mockResolvedValue({
      replay: false,
      order: { id: "pos1", source: "POS", total: "70.00" },
    });
    const res = await postPos(
      jsonRequest("/api/provider/pos/sales", {
        method: "POST",
        headers: { "Idempotency-Key": "11111111-1111-4111-8111-111111111111" },
        body: {
          paymentMethod: "CASH",
          items: [
            {
              customItem: { name: "Piña miel", unitPrice: "35.00" },
              quantity: "2",
            },
          ],
        },
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.source).toBe("POS");
  });
});
