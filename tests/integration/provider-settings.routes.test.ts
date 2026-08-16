import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";

const getSession = vi.fn();
const getProviderByUserId = vi.fn();
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

vi.mock("@/lib/services/provider.service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/provider.service")>(
    "@/lib/services/provider.service"
  );
  return {
    ...actual,
    getProviderByUserId: (...args: unknown[]) => getProviderByUserId(...args),
    updateProviderSettings: (...args: unknown[]) => updateProviderSettings(...args),
  };
});

import { GET, PATCH } from "@/app/api/provider/me/route";
import { GoogleReviewsLockedError } from "@/lib/services/provider.service";

function jsonRequest(
  url: string,
  options: { method?: string; body?: unknown } = {}
) {
  return new NextRequest(new URL(url, "http://localhost:8080"), {
    method: options.method ?? "GET",
    headers: { "content-type": "application/json" },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

describe("provider settings routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET includes googleReviewsLocked", async () => {
    getSession.mockReturnValue({
      sub: "u2",
      role: UserRole.PROVIDER,
      email: "p@test.com",
      name: "Carlos",
    });
    getProviderByUserId.mockResolvedValue({
      id: "p1",
      businessName: "El Paraíso",
      address: "Av. 1",
      city: "Monterrey",
      latitude: 25.67,
      longitude: -100.31,
      phone: "+5281",
      description: null,
      isVerified: false,
      isActive: true,
      logoUrl: null,
      coverUrl: null,
      preparationTimeMinutes: 20,
      offersDelivery: false,
      googlePlaceId: null,
      googleMapsUrl: null,
      googleReviewsEnabled: false,
    });
    const res = await GET(jsonRequest("/api/provider/me"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.googleReviewsLocked).toBe(true);
  });

  it("PATCH Google fields when unverified returns 403", async () => {
    getSession.mockReturnValue({
      sub: "u2",
      role: UserRole.PROVIDER,
      email: "p@test.com",
      name: "Carlos",
    });
    updateProviderSettings.mockRejectedValue(new GoogleReviewsLockedError());
    const res = await PATCH(
      jsonRequest("/api/provider/me", {
        method: "PATCH",
        body: { googleReviewsEnabled: true },
      })
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Requiere verificación de tu negocio");
  });

  it("PATCH colors-only returns 200 without Google lock", async () => {
    getSession.mockReturnValue({
      sub: "u2",
      role: UserRole.PROVIDER,
      email: "p@test.com",
      name: "Carlos",
    });
    updateProviderSettings.mockResolvedValue({
      id: "p1",
      businessName: "El Paraíso",
      primaryColor: "#1B5E20",
      secondaryColor: "#0D47A1",
      googleReviewsLocked: true,
    });
    const res = await PATCH(
      jsonRequest("/api/provider/me", {
        method: "PATCH",
        body: { primaryColor: "#1B5E20", secondaryColor: "#0D47A1" },
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.primaryColor).toBe("#1B5E20");
  });

  it("PATCH incomplete color pair returns 400", async () => {
    getSession.mockReturnValue({
      sub: "u2",
      role: UserRole.PROVIDER,
      email: "p@test.com",
      name: "Carlos",
    });
    const res = await PATCH(
      jsonRequest("/api/provider/me", {
        method: "PATCH",
        body: { primaryColor: "#1B5E20" },
      })
    );
    expect(res.status).toBe(400);
    expect(updateProviderSettings).not.toHaveBeenCalled();
  });
});
