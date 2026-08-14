import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrderSource, OrderStatus } from "@prisma/client";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    order: { findUnique: vi.fn() },
    review: {
      create: vi.fn(),
      aggregate: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    provider: { update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ default: prismaMock }));
vi.mock("@/lib/audit", () => ({
  writeAuditLog: vi.fn().mockResolvedValue("audit1"),
}));

import {
  createReview,
  recomputeProviderRating,
  ReviewConflictError,
} from "@/lib/services/review.service";
import { OrderForbiddenError } from "@/lib/orders/errors";

describe("recomputeProviderRating", () => {
  it("sets rating 0 when there are no reviews", async () => {
    const tx = {
      review: {
        aggregate: vi.fn().mockResolvedValue({
          _avg: { rating: null },
          _count: { _all: 0 },
        }),
      },
      provider: { update: vi.fn().mockResolvedValue({}) },
    };
    const result = await recomputeProviderRating(tx as never, "prov1");
    expect(result).toEqual({ rating: 0, reviewCount: 0 });
    expect(tx.provider.update).toHaveBeenCalledWith({
      where: { id: "prov1" },
      data: { rating: 0, reviewCount: 0 },
    });
  });

  it("writes AVG and COUNT", async () => {
    const tx = {
      review: {
        aggregate: vi.fn().mockResolvedValue({
          _avg: { rating: 4.5 },
          _count: { _all: 2 },
        }),
      },
      provider: { update: vi.fn().mockResolvedValue({}) },
    };
    const result = await recomputeProviderRating(tx as never, "prov1");
    expect(result).toEqual({ rating: 4.5, reviewCount: 2 });
  });
});

describe("createReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forbids POS walk-in orders", async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      id: "ord1",
      source: OrderSource.POS,
      status: OrderStatus.DELIVERED,
      clientId: null,
      providerId: "prov1",
      review: null,
    });
    await expect(
      createReview({
        orderId: "ord1",
        clientId: "client1",
        input: { rating: 5, comment: null },
      })
    ).rejects.toBeInstanceOf(OrderForbiddenError);
  });

  it("conflicts when order is not DELIVERED", async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      id: "ord1",
      source: OrderSource.MARKETPLACE,
      status: OrderStatus.PENDING,
      clientId: "client1",
      providerId: "prov1",
      review: null,
    });
    await expect(
      createReview({
        orderId: "ord1",
        clientId: "client1",
        input: { rating: 5, comment: null },
      })
    ).rejects.toBeInstanceOf(ReviewConflictError);
  });
});
