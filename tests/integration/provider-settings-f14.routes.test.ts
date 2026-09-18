import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";

const getSession = vi.fn();
const updateProviderSettings = vi.fn();

vi.mock("@/lib/auth/session", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/session")>(
    "@/lib/auth/session"
  );
  return {
    ...actual,
    getSession: (...args: unknown[]) => getSession(...args),
  };
});

vi.mock("@/lib/providers/owned-provider", () => ({
  listOwnedProviders: vi.fn().mockResolvedValue([
    {
      id: "p1",
      userId: "u2",
      businessName: "El Paraíso",
      address: "Av. 1",
      city: "Monterrey",
      latitude: 25.67,
      longitude: -100.31,
      phone: "+5281",
      description: null,
      isVerified: true,
      verifiedAt: new Date("2026-08-01T18:00:00.000Z"),
      isActive: true,
      logoUrl: null,
      coverUrl: null,
      preparationTimeMinutes: 20,
      offersDelivery: false,
      whatsappEnabled: false,
      acceptsCardAtStore: false,
      offersWholesale: false,
      offersRetail: true,
      openingHours: null,
      googlePlaceId: null,
      googleMapsUrl: null,
      googleReviewsEnabled: false,
      primaryColor: null,
      secondaryColor: null,
    },
  ]),
  findOwnedProvider: vi.fn().mockResolvedValue({ id: "p1", userId: "u2" }),
}));

vi.mock("@/lib/services/provider.service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/provider.service")>(
    "@/lib/services/provider.service"
  );
  return {
    ...actual,
    updateProviderSettings: (...args: unknown[]) => updateProviderSettings(...args),
  };
});

import { PATCH } from "@/app/api/provider/me/route";

function jsonRequest(url: string, body: unknown) {
  return new NextRequest(new URL(url, "http://localhost:8080"), {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/provider/me F14", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSession.mockReturnValue({
      sub: "u2",
      role: UserRole.PROVIDER,
      email: "p@test.com",
      name: "Carlos",
    });
  });

  it("returns 400 for geo outside AMM", async () => {
    const res = await PATCH(
      jsonRequest("/api/provider/me", { latitude: 19.43, longitude: -99.13 })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details.some((d: { field: string }) => d.field === "latitude")).toBe(true);
    expect(updateProviderSettings).not.toHaveBeenCalled();
  });

  it("returns 400 if isVerified is sent", async () => {
    const res = await PATCH(jsonRequest("/api/provider/me", { isVerified: false }));
    expect(res.status).toBe(400);
    expect(updateProviderSettings).not.toHaveBeenCalled();
  });

  it("returns 200 with isVerified unchanged after moving the pin", async () => {
    updateProviderSettings.mockResolvedValue({
      id: "p1",
      businessName: "Frutas El Paraíso Centro",
      latitude: 25.6714,
      longitude: -100.3089,
      isVerified: true,
      verifiedAt: "2026-08-01T18:00:00.000Z",
      googleReviewsLocked: false,
    });
    const res = await PATCH(
      jsonRequest("/api/provider/me", { latitude: 25.6714, longitude: -100.3089 })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.isVerified).toBe(true);
  });
});
