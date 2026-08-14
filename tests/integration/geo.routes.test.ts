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

  it("returns 400 when radiusKm is out of range", async () => {
    const res = await listGet(
      jsonRequest("/api/providers?lat=25.67&lng=-100.31&radiusKm=30")
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.details?.[0]?.field).toBe("radiusKm");
  });

  it("returns 400 for coords outside Monterrey", async () => {
    const res = await listGet(jsonRequest("/api/providers?lat=19.43&lng=-99.13"));
    expect(res.status).toBe(400);
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
});
