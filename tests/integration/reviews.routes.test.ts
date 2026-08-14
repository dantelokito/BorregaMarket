import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";

const getSession = vi.fn();
const createReview = vi.fn();
const getOrderReview = vi.fn();
const listProviderReviews = vi.fn();
const deleteReviewAsAdmin = vi.fn();

vi.mock("@/lib/auth/session", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/session")>(
    "@/lib/auth/session"
  );
  return {
    ...actual,
    getSession: (...args: unknown[]) => getSession(...args),
  };
});

vi.mock("@/lib/services/review.service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/review.service")>(
    "@/lib/services/review.service"
  );
  return {
    ...actual,
    createReview: (...args: unknown[]) => createReview(...args),
    getOrderReview: (...args: unknown[]) => getOrderReview(...args),
    listProviderReviews: (...args: unknown[]) => listProviderReviews(...args),
    deleteReviewAsAdmin: (...args: unknown[]) => deleteReviewAsAdmin(...args),
  };
});

import { POST as postReview } from "@/app/api/orders/[id]/reviews/route";
import { GET as getReview } from "@/app/api/orders/[id]/review/route";
import { GET as listReviews } from "@/app/api/providers/[id]/reviews/route";
import { DELETE as deleteReview } from "@/app/api/admin/reviews/[id]/route";
import { ReviewConflictError, ReviewNotFoundError } from "@/lib/services/review.service";
import { OrderForbiddenError } from "@/lib/orders/errors";

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

const params = { params: Promise.resolve({ id: "ord1" }) };

describe("reviews routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without session on POST review", async () => {
    getSession.mockReturnValue(null);
    const res = await postReview(
      jsonRequest("/api/orders/ord1/reviews", {
        method: "POST",
        body: { rating: 5 },
      }),
      params
    );
    expect(res.status).toBe(401);
  });

  it("returns 201 on create", async () => {
    getSession.mockReturnValue({
      sub: "u1",
      role: UserRole.CLIENT,
      email: "c@test.com",
      name: "María",
    });
    createReview.mockResolvedValue({
      id: "rev1",
      orderId: "ord1",
      providerId: "prov1",
      rating: 5,
      comment: "Muy fresca",
      createdAt: "2026-08-14T18:00:00.000Z",
    });
    const res = await postReview(
      jsonRequest("/api/orders/ord1/reviews", {
        method: "POST",
        body: { rating: 5, comment: "Muy fresca" },
      }),
      params
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.rating).toBe(5);
  });

  it("returns 409 when already reviewed", async () => {
    getSession.mockReturnValue({
      sub: "u1",
      role: UserRole.CLIENT,
      email: "c@test.com",
      name: "María",
    });
    createReview.mockRejectedValue(
      new ReviewConflictError("Este pedido ya tiene una reseña")
    );
    const res = await postReview(
      jsonRequest("/api/orders/ord1/reviews", {
        method: "POST",
        body: { rating: 5 },
      }),
      params
    );
    expect(res.status).toBe(409);
  });

  it("returns 403 for POS / foreign order", async () => {
    getSession.mockReturnValue({
      sub: "u1",
      role: UserRole.CLIENT,
      email: "c@test.com",
      name: "María",
    });
    createReview.mockRejectedValue(
      new OrderForbiddenError("No puedes reseñar este pedido")
    );
    const res = await postReview(
      jsonRequest("/api/orders/ord1/reviews", {
        method: "POST",
        body: { rating: 5 },
      }),
      params
    );
    expect(res.status).toBe(403);
  });

  it("lists public reviews with extra meta", async () => {
    listProviderReviews.mockResolvedValue({
      data: [
        {
          id: "rev1",
          rating: 5,
          comment: "Ok",
          authorName: "María G.",
          createdAt: "2026-08-14T18:00:00.000Z",
        },
      ],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1, rating: 5, reviewCount: 1 },
    });
    const res = await listReviews(
      jsonRequest("/api/providers/prov1/reviews"),
      { params: Promise.resolve({ id: "prov1" }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.meta.reviewCount).toBe(1);
    expect(body.data[0].authorName).toBe("María G.");
  });

  it("GET own review 404", async () => {
    getSession.mockReturnValue({
      sub: "u1",
      role: UserRole.CLIENT,
      email: "c@test.com",
      name: "María",
    });
    getOrderReview.mockRejectedValue(new ReviewNotFoundError());
    const res = await getReview(jsonRequest("/api/orders/ord1/review"), params);
    expect(res.status).toBe(404);
  });

  it("admin delete returns deleted true", async () => {
    getSession.mockReturnValue({
      sub: "admin",
      role: UserRole.ADMIN,
      email: "a@test.com",
      name: "Admin",
    });
    deleteReviewAsAdmin.mockResolvedValue({ id: "rev1", deleted: true });
    const res = await deleteReview(
      jsonRequest("/api/admin/reviews/rev1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "rev1" }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deleted).toBe(true);
  });
});
