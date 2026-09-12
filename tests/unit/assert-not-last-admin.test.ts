import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@prisma/client";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: {
      findUnique: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({ default: prismaMock }));

import { assertNotLastAdmin, LastAdminError } from "@/lib/auth/assert-not-last-admin";

describe("assertNotLastAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws 409-style LastAdminError when demoting the last active ADMIN", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "a1",
      role: UserRole.ADMIN,
      isActive: true,
    });
    prismaMock.user.count.mockResolvedValue(0);

    await expect(
      assertNotLastAdmin({ userId: "a1", nextRole: UserRole.CLIENT })
    ).rejects.toMatchObject({
      name: "LastAdminError",
      field: "role",
      message: "Debe existir al menos un administrador activo",
    });
  });

  it("throws when deactivating the last active ADMIN", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "a1",
      role: UserRole.ADMIN,
      isActive: true,
    });
    prismaMock.user.count.mockResolvedValue(0);

    try {
      await assertNotLastAdmin({ userId: "a1", nextIsActive: false });
      expect.fail("expected LastAdminError");
    } catch (err) {
      expect(err).toBeInstanceOf(LastAdminError);
      expect((err as LastAdminError).field).toBe("isActive");
      expect((err as LastAdminError).details()).toEqual([
        { field: "isActive", message: "No se puede quitar el último administrador" },
      ]);
    }
  });

  it("allows demotion when another ADMIN remains", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "a1",
      role: UserRole.ADMIN,
      isActive: true,
    });
    prismaMock.user.count.mockResolvedValue(1);

    await expect(
      assertNotLastAdmin({ userId: "a1", nextRole: UserRole.PROVIDER })
    ).resolves.toBeUndefined();
  });

  it("no-ops when the user is not an active ADMIN", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u1",
      role: UserRole.CLIENT,
      isActive: true,
    });

    await expect(
      assertNotLastAdmin({ userId: "u1", nextIsActive: false })
    ).resolves.toBeUndefined();
    expect(prismaMock.user.count).not.toHaveBeenCalled();
  });
});
