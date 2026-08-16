import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { BRAND_PAIR_MESSAGE, PRIMARY_CONTRAST_MESSAGE } from "@/lib/color/contrast";

const getSession = vi.fn();
const updateAdminProvider = vi.fn();

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
    updateAdminProvider: (...args: unknown[]) => updateAdminProvider(...args),
  };
});

import { PATCH } from "@/app/api/admin/providers/[id]/route";

function jsonRequest(url: string, body: unknown) {
  return new NextRequest(new URL(url, "http://localhost:8080"), {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const params = { params: Promise.resolve({ id: "p1" }) };

describe("PATCH /api/admin/providers/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSession.mockReturnValue({
      sub: "admin1",
      role: UserRole.ADMIN,
      email: "a@test.com",
      name: "Admin",
    });
  });

  it("accepts isVerified-only (F1)", async () => {
    updateAdminProvider.mockResolvedValue({
      id: "p1",
      businessName: "El Paraíso",
      isVerified: true,
      googleReviewsEnabled: false,
      primaryColor: null,
      secondaryColor: null,
    });
    const res = await PATCH(jsonRequest("/api/admin/providers/p1", { isVerified: true }), params);
    expect(res.status).toBe(200);
    expect(updateAdminProvider).toHaveBeenCalled();
  });

  it("rejects incomplete brand pair with 400", async () => {
    const res = await PATCH(
      jsonRequest("/api/admin/providers/p1", { primaryColor: "#1B5E20" }),
      params
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.details[0].message).toBe(BRAND_PAIR_MESSAGE);
    expect(updateAdminProvider).not.toHaveBeenCalled();
  });

  it("rejects low-contrast primary with 400", async () => {
    const res = await PATCH(
      jsonRequest("/api/admin/providers/p1", {
        primaryColor: "#F9A825",
        secondaryColor: "#0D47A1",
      }),
      params
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.details[0].message).toBe(PRIMARY_CONTRAST_MESSAGE);
  });
});
