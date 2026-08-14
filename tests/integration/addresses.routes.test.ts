import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";

const getSession = vi.fn();
const listAddresses = vi.fn();
const createAddress = vi.fn();
const updateAddress = vi.fn();
const deleteAddress = vi.fn();

vi.mock("@/lib/auth/session", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/session")>(
    "@/lib/auth/session"
  );
  return {
    ...actual,
    getSession: (...args: unknown[]) => getSession(...args),
  };
});

vi.mock("@/lib/services/address.service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/address.service")>(
    "@/lib/services/address.service"
  );
  return {
    ...actual,
    listAddresses: (...args: unknown[]) => listAddresses(...args),
    createAddress: (...args: unknown[]) => createAddress(...args),
    updateAddress: (...args: unknown[]) => updateAddress(...args),
    deleteAddress: (...args: unknown[]) => deleteAddress(...args),
  };
});

import { GET, POST } from "@/app/api/users/me/addresses/route";
import { PATCH, DELETE } from "@/app/api/users/me/addresses/[id]/route";
import { AddressNotFoundError } from "@/lib/services/address.service";

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

describe("addresses routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without session", async () => {
    getSession.mockReturnValue(null);
    const res = await GET(jsonRequest("/api/users/me/addresses"));
    expect(res.status).toBe(401);
  });

  it("returns 403 for PROVIDER", async () => {
    getSession.mockReturnValue({
      sub: "p1",
      role: UserRole.PROVIDER,
      email: "p@test.com",
      name: "Carlos",
    });
    const res = await GET(jsonRequest("/api/users/me/addresses"));
    expect(res.status).toBe(403);
  });

  it("creates an address with 201", async () => {
    getSession.mockReturnValue({
      sub: "u1",
      role: UserRole.CLIENT,
      email: "c@test.com",
      name: "María",
    });
    createAddress.mockResolvedValue({
      id: "addr1",
      label: "Casa",
      formattedAddress: "Av. Juárez 123, Centro, Monterrey",
      lat: 25.6714,
      lng: -100.3089,
      isFavorite: true,
      isDefault: true,
      createdAt: "2026-08-14T18:00:00.000Z",
    });
    const res = await POST(
      jsonRequest("/api/users/me/addresses", {
        method: "POST",
        body: {
          label: "Casa",
          formattedAddress: "Av. Juárez 123, Centro, Monterrey",
          lat: 25.6714,
          lng: -100.3089,
          isFavorite: true,
          isDefault: true,
        },
      })
    );
    expect(res.status).toBe(201);
  });

  it("returns 400 for coords outside Monterrey", async () => {
    getSession.mockReturnValue({
      sub: "u1",
      role: UserRole.CLIENT,
      email: "c@test.com",
      name: "María",
    });
    const res = await POST(
      jsonRequest("/api/users/me/addresses", {
        method: "POST",
        body: {
          label: "CDMX",
          formattedAddress: "Zócalo",
          lat: 19.43,
          lng: -99.13,
        },
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.details?.[0]?.message).toContain("Monterrey");
  });

  it("hides cross-user delete as 404", async () => {
    getSession.mockReturnValue({
      sub: "u1",
      role: UserRole.CLIENT,
      email: "c@test.com",
      name: "María",
    });
    deleteAddress.mockRejectedValue(new AddressNotFoundError());
    const res = await DELETE(
      jsonRequest("/api/users/me/addresses/other", { method: "DELETE" }),
      { params: Promise.resolve({ id: "other" }) }
    );
    expect(res.status).toBe(404);
    expect(updateAddress).not.toHaveBeenCalled();
  });
});
