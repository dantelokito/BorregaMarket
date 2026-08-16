import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@prisma/client";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    provider: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({ default: prismaMock }));

import { getAuthSessionPayload } from "@/lib/services/session.service";

describe("getAuthSessionPayload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns guest payload without hitting Prisma", async () => {
    const data = await getAuthSessionPayload(null);
    expect(data).toEqual({ authenticated: false, role: null, brand: null });
    expect(prismaMock.provider.findUnique).not.toHaveBeenCalled();
  });

  it("returns brand null for CLIENT and ADMIN", async () => {
    const client = await getAuthSessionPayload({
      sub: "c1",
      role: UserRole.CLIENT,
      email: "c@test.com",
      name: "María",
    });
    expect(client).toEqual({ authenticated: true, role: "CLIENT", brand: null });

    const admin = await getAuthSessionPayload({
      sub: "a1",
      role: UserRole.ADMIN,
      email: "a@test.com",
      name: "Admin",
    });
    expect(admin.brand).toBeNull();
    expect(prismaMock.provider.findUnique).not.toHaveBeenCalled();
  });

  it("returns provider brand when the pair is valid", async () => {
    prismaMock.provider.findUnique.mockResolvedValue({
      primaryColor: "#1b5e20",
      secondaryColor: "#0d47a1",
    });
    const data = await getAuthSessionPayload({
      sub: "u2",
      role: UserRole.PROVIDER,
      email: "p@test.com",
      name: "Carlos",
    });
    expect(data).toEqual({
      authenticated: true,
      role: "PROVIDER",
      brand: {
        primaryColor: "#1B5E20",
        secondaryColor: "#0D47A1",
        source: "provider",
      },
    });
  });

  it("falls back when provider has no row or invalid contrast", async () => {
    prismaMock.provider.findUnique.mockResolvedValue(null);
    const missing = await getAuthSessionPayload({
      sub: "u2",
      role: UserRole.PROVIDER,
      email: "p@test.com",
      name: "Carlos",
    });
    expect(missing.brand).toBeNull();

    prismaMock.provider.findUnique.mockResolvedValue({
      primaryColor: "#F9A825",
      secondaryColor: "#FFFF00",
    });
    const invalid = await getAuthSessionPayload({
      sub: "u2",
      role: UserRole.PROVIDER,
      email: "p@test.com",
      name: "Carlos",
    });
    expect(invalid).toEqual({ authenticated: true, role: "PROVIDER", brand: null });
  });
});
