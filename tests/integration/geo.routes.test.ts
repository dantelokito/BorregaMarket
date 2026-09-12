import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const listProviders = vi.fn();
const getProviderEta = vi.fn();

vi.mock("@/lib/services/provider.service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/provider.service")>(
    "@/lib/services/provider.service"
  );
  return {
    ...actual,
    listProviders: (...args: unknown[]) => listProviders(...args),
    getProviderEta: (...args: unknown[]) => getProviderEta(...args),
  };
});

import { GET as listGet } from "@/app/api/providers/route";
import { GET as etaGet } from "@/app/api/providers/[id]/eta/route";

function jsonRequest(url: string) {
  return new NextRequest(new URL(url, "http://localhost:8080"));
}

describe("geo providers routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when only lat is sent", async () => {
    const res = await listGet(jsonRequest("/api/providers?lat=25.67"));
    expect(res.status).toBe(400);
    expect(listProviders).not.toHaveBeenCalled();
  });

  it.each([
    { radiusKm: 0.5, applied: 0.5 },
    { radiusKm: 10, applied: 10 },
    { radiusKm: 22, applied: 10 },
    { radiusKm: 0, applied: 0.5 },
    { radiusKm: 0.7, applied: 0.7 },
  ])("clamps radiusKm=$radiusKm to $applied instead of 400", async ({ radiusKm, applied }) => {
    listProviders.mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0, radiusKm: applied },
    });
    const res = await listGet(
      jsonRequest(`/api/providers?lat=25.67&lng=-100.31&radiusKm=${radiusKm}`)
    );
    expect(res.status).toBe(200);
    expect(listProviders).toHaveBeenCalledWith(
      expect.objectContaining({
        geo: expect.objectContaining({ radiusKm: applied }),
      }),
      expect.any(Object)
    );
    const body = await res.json();
    expect(body.meta.radiusKm).toBe(applied);
  });

  it("rejects q of 1 character with 400", async () => {
    const res = await listGet(jsonRequest("/api/providers?q=m"));
    expect(res.status).toBe(400);
    expect(listProviders).not.toHaveBeenCalled();
  });

  it("accepts CDMX coords with 200 (AMM 400 revoked)", async () => {
    listProviders.mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0, radiusKm: 10 },
    });
    const res = await listGet(jsonRequest("/api/providers?lat=19.43&lng=-99.13"));
    expect(res.status).toBe(200);
    expect(listProviders).toHaveBeenCalledWith(
      expect.objectContaining({
        geo: { lat: 19.43, lng: -99.13, radiusKm: 10 },
      }),
      expect.any(Object)
    );
  });

  it("returns 400 for coords outside Mexico", async () => {
    const res = await listGet(jsonRequest("/api/providers?lat=33.0&lng=-99.0"));
    expect(res.status).toBe(400);
    expect(listProviders).not.toHaveBeenCalled();
    const body = await res.json();
    expect(body.details?.some((d: { field: string; message: string }) =>
      (d.field === "lat" || d.field === "lng") && d.message.includes("México")
    )).toBe(true);
  });

  it("passes geo filter and returns distanceKm", async () => {
    listProviders.mockResolvedValue({
      data: [{ id: "p1", businessName: "El Paraíso", distanceKm: 2.4 }],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1, radiusKm: 10 },
    });
    const res = await listGet(jsonRequest("/api/providers?lat=25.6714&lng=-100.3089"));
    expect(res.status).toBe(200);
    expect(listProviders).toHaveBeenCalledWith(
      expect.objectContaining({
        geo: { lat: 25.6714, lng: -100.3089, radiusKm: 10 },
      }),
      expect.any(Object)
    );
    const body = await res.json();
    expect(body.data[0].distanceKm).toBe(2.4);
    expect(body.meta.radiusKm).toBe(10);
  });

  it("returns ETA envelope", async () => {
    getProviderEta.mockResolvedValue({
      providerId: "p1",
      preparationTimeMinutes: 20,
      travelMinutes: 8,
      etaMinutes: 28,
      distanceKm: 3.2,
      fulfillmentType: "PICKUP",
      copyKey: "eta_ready_approx",
    });
    const res = await etaGet(
      jsonRequest("/api/providers/p1/eta?lat=25.67&lng=-100.31"),
      { params: Promise.resolve({ id: "p1" }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.copyKey).toBe("eta_ready_approx");
  });

  describe("offersWholesale / offersDelivery query (F9)", () => {
    const geo = "lat=25.6714&lng=-100.3089&radiusKm=10";

    it("passes offersWholesale=true with geo", async () => {
      listProviders.mockResolvedValue({
        data: [{ id: "w1", offersWholesale: true, offersDelivery: false }],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1, radiusKm: 10 },
      });
      const res = await listGet(
        jsonRequest(`/api/providers?${geo}&offersWholesale=true`)
      );
      expect(res.status).toBe(200);
      expect(listProviders).toHaveBeenCalledWith(
        expect.objectContaining({
          offersWholesale: true,
          geo: expect.objectContaining({ lat: 25.6714, lng: -100.3089, radiusKm: 10 }),
        }),
        expect.any(Object)
      );
      const body = await res.json();
      expect(body.meta.total).toBe(1);
    });

    it("passes offersDelivery=true with geo", async () => {
      listProviders.mockResolvedValue({
        data: [{ id: "d1", offersWholesale: false, offersDelivery: true }],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1, radiusKm: 10 },
      });
      const res = await listGet(
        jsonRequest(`/api/providers?${geo}&offersDelivery=true`)
      );
      expect(res.status).toBe(200);
      expect(listProviders).toHaveBeenCalledWith(
        expect.objectContaining({ offersDelivery: true }),
        expect.any(Object)
      );
    });

    it("ANDs both flags when both true", async () => {
      listProviders.mockResolvedValue({
        data: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0, radiusKm: 10 },
      });
      const res = await listGet(
        jsonRequest(`/api/providers?${geo}&offersWholesale=true&offersDelivery=true`)
      );
      expect(res.status).toBe(200);
      expect(listProviders).toHaveBeenCalledWith(
        expect.objectContaining({
          offersWholesale: true,
          offersDelivery: true,
        }),
        expect.any(Object)
      );
    });

    it("ANDs flags with q and geo", async () => {
      listProviders.mockResolvedValue({
        data: [{ id: "p1", businessName: "Mango King" }],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1, radiusKm: 10 },
      });
      const res = await listGet(
        jsonRequest(`/api/providers?${geo}&q=mango&offersWholesale=true`)
      );
      expect(res.status).toBe(200);
      expect(listProviders).toHaveBeenCalledWith(
        expect.objectContaining({
          q: "mango",
          offersWholesale: true,
          geo: expect.objectContaining({ radiusKm: 10 }),
        }),
        expect.any(Object)
      );
    });

    it("returns 200 with total=0 when no matches", async () => {
      listProviders.mockResolvedValue({
        data: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0, radiusKm: 10 },
      });
      const res = await listGet(
        jsonRequest(`/api/providers?${geo}&offersDelivery=true`)
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toEqual([]);
      expect(body.meta.total).toBe(0);
    });

    it("returns 400 for invalid offersWholesale", async () => {
      const res = await listGet(
        jsonRequest(`/api/providers?${geo}&offersWholesale=maybe`)
      );
      expect(res.status).toBe(400);
      expect(listProviders).not.toHaveBeenCalled();
      const body = await res.json();
      expect(body.details?.some((d: { field: string }) => d.field === "offersWholesale")).toBe(
        true
      );
    });

    it("treats false/0 as absent (no filter)", async () => {
      listProviders.mockResolvedValue({
        data: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0, radiusKm: 10 },
      });
      const res = await listGet(
        jsonRequest(`/api/providers?${geo}&offersWholesale=false&offersDelivery=0`)
      );
      expect(res.status).toBe(200);
      const filters = listProviders.mock.calls[0][0] as Record<string, unknown>;
      expect(filters.offersWholesale).toBeUndefined();
      expect(filters.offersDelivery).toBeUndefined();
    });

    it("accepts 1 as true", async () => {
      listProviders.mockResolvedValue({
        data: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0, radiusKm: 10 },
      });
      const res = await listGet(
        jsonRequest(`/api/providers?${geo}&offersWholesale=1`)
      );
      expect(res.status).toBe(200);
      expect(listProviders).toHaveBeenCalledWith(
        expect.objectContaining({ offersWholesale: true }),
        expect.any(Object)
      );
    });
  });
});
