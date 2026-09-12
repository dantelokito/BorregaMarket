import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuditAction, SystemModule } from "@prisma/client";

const { prismaMock, writeAuditLog, checkContactRateLimit, inngestSend } = vi.hoisted(() => ({
  prismaMock: {
    provider: { findFirst: vi.fn() },
    product: { findMany: vi.fn() },
  },
  writeAuditLog: vi.fn(),
  checkContactRateLimit: vi.fn(),
  inngestSend: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ default: prismaMock }));
vi.mock("@/lib/audit", () => ({ writeAuditLog }));
vi.mock("@/lib/rate-limit/contact", () => ({
  checkContactRateLimit: (...args: unknown[]) => checkContactRateLimit(...args),
  ContactRedisUnavailableError: class ContactRedisUnavailableError extends Error {
    constructor(message = "Servicio no disponible. Intenta más tarde.") {
      super(message);
      this.name = "ContactRedisUnavailableError";
    }
  },
}));
vi.mock("@/lib/inngest/client", () => ({
  inngest: { send: (...args: unknown[]) => inngestSend(...args) },
}));

import {
  ContactRateLimitError,
  registerContact,
} from "@/lib/services/contact.service";

describe("registerContact rate limit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.provider.findFirst.mockResolvedValue({
      id: "p1",
      businessName: "Frutas El Paraíso",
      user: { email: "owner@test.com" },
    });
    writeAuditLog.mockResolvedValue("audit-rl");
  });

  it("does not create a successful contact or enqueue Inngest on 429", async () => {
    checkContactRateLimit.mockResolvedValue(false);

    await expect(
      registerContact("p1", { source: "call_button", productIds: ["prod1"] }, {
        ipAddress: "1.1.1.1",
        userId: "u1",
      })
    ).rejects.toBeInstanceOf(ContactRateLimitError);

    expect(writeAuditLog).toHaveBeenCalledTimes(1);
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        module: SystemModule.PROVIDERS,
        action: AuditAction.CONTACT,
        entityId: "p1",
        details: expect.objectContaining({
          rateLimited: true,
          reason: "rate_limited",
          productNames: [],
        }),
      })
    );
    expect(prismaMock.product.findMany).not.toHaveBeenCalled();
    expect(inngestSend).not.toHaveBeenCalled();
  });
});
