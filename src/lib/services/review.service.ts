import {
  AuditAction,
  OrderSource,
  OrderStatus,
  Prisma,
  SystemModule,
  UserRole,
} from "@prisma/client";
import prisma from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { buildMeta } from "@/lib/services/pagination";
import { OrderForbiddenError, OrderNotFoundError } from "@/lib/orders/errors";
import { formatAuthorName, type CreateReviewInput } from "@/lib/validators/review";

export class ReviewConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReviewConflictError";
  }
}

export class ReviewNotFoundError extends Error {
  constructor(message = "Reseña no encontrada") {
    super(message);
    this.name = "ReviewNotFoundError";
  }
}

function serializeReview(review: {
  id: string;
  orderId: string;
  providerId: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
}) {
  return {
    id: review.id,
    orderId: review.orderId,
    providerId: review.providerId,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt.toISOString(),
  };
}

export async function recomputeProviderRating(
  tx: Prisma.TransactionClient,
  providerId: string
) {
  const agg = await tx.review.aggregate({
    where: { providerId },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const reviewCount = agg._count._all;
  const rating = reviewCount === 0 ? 0 : (agg._avg.rating ?? 0);
  await tx.provider.update({
    where: { id: providerId },
    data: { rating, reviewCount },
  });
  return { rating, reviewCount };
}

export async function createReview(params: {
  orderId: string;
  clientId: string;
  input: CreateReviewInput;
}) {
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: { review: { select: { id: true } } },
  });

  if (!order) {
    throw new OrderNotFoundError();
  }

  if (
    order.source !== OrderSource.MARKETPLACE ||
    !order.clientId ||
    order.clientId !== params.clientId
  ) {
    throw new OrderForbiddenError("No puedes reseñar este pedido");
  }

  if (order.status !== OrderStatus.DELIVERED) {
    throw new ReviewConflictError("Solo se puede reseñar un pedido entregado");
  }

  if (order.review) {
    throw new ReviewConflictError("Este pedido ya tiene una reseña");
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const review = await tx.review.create({
        data: {
          orderId: order.id,
          clientId: params.clientId,
          providerId: order.providerId,
          rating: params.input.rating,
          comment: params.input.comment,
        },
      });
      await recomputeProviderRating(tx, order.providerId);
      return review;
    });
    return serializeReview(created);
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new ReviewConflictError("Este pedido ya tiene una reseña");
    }
    throw err;
  }
}

export async function getOrderReview(params: {
  orderId: string;
  userId: string;
  role: UserRole;
}) {
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: { review: true },
  });

  if (!order) {
    throw new OrderNotFoundError();
  }

  const isOwner = order.clientId === params.userId;
  const isAdmin = params.role === UserRole.ADMIN;
  if (!isOwner && !isAdmin) {
    throw new OrderForbiddenError("No puedes reseñar este pedido");
  }

  if (!order.review) {
    throw new ReviewNotFoundError();
  }

  return serializeReview(order.review);
}

export async function listProviderReviews(params: {
  providerId: string;
  page: number;
  limit: number;
  skip: number;
}) {
  const provider = await prisma.provider.findFirst({
    where: { id: params.providerId, isActive: true },
    select: { id: true, rating: true, reviewCount: true },
  });
  if (!provider) {
    throw new ReviewNotFoundError("Frutería no encontrada");
  }

  const [total, reviews] = await Promise.all([
    prisma.review.count({ where: { providerId: provider.id } }),
    prisma.review.findMany({
      where: { providerId: provider.id },
      include: { client: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip: params.skip,
      take: params.limit,
    }),
  ]);

  return {
    data: reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      authorName: formatAuthorName(review.client.name),
      createdAt: review.createdAt.toISOString(),
    })),
    meta: {
      ...buildMeta(params.page, params.limit, total),
      rating: provider.rating,
      reviewCount: provider.reviewCount,
    },
  };
}

export async function deleteReviewAsAdmin(params: {
  reviewId: string;
  adminUserId: string;
  ipAddress?: string;
}) {
  const existing = await prisma.review.findUnique({
    where: { id: params.reviewId },
  });
  if (!existing) {
    throw new ReviewNotFoundError();
  }

  await prisma.$transaction(async (tx) => {
    await tx.review.delete({ where: { id: existing.id } });
    await recomputeProviderRating(tx, existing.providerId);
  });

  await writeAuditLog({
    module: SystemModule.PROVIDERS,
    action: AuditAction.DELETE,
    entityId: existing.id,
    userId: params.adminUserId,
    ipAddress: params.ipAddress,
    details: {
      providerId: existing.providerId,
      orderId: existing.orderId,
      rating: existing.rating,
    },
  });

  return { id: existing.id, deleted: true };
}
