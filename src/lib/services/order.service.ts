import {
  AuditAction,
  OrderSource,
  OrderStatus,
  PaymentMethod,
  Prisma,
  SystemModule,
  UserRole,
} from "@prisma/client";
import prisma from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { buildMeta } from "@/lib/services/pagination";
import { ProviderNotFoundError } from "@/lib/services/provider.service";
import { formatMoney, formatQuantity, lineSubtotal, sumMoney, toMoney } from "@/lib/money";
import {
  InvalidTransitionError,
  OrderForbiddenError,
  OrderNotFoundError,
  OrderValidationError,
  ProductUnavailableError,
} from "@/lib/orders/errors";
import { consolidateMarketplaceItems } from "@/lib/orders/items";
import {
  orderDetailInclude,
  serializeClientOrderSummary,
  serializeOrder,
  serializeProviderOrderRow,
  type OrderRecord,
} from "@/lib/orders/serialize";
import { canTransition } from "@/lib/orders/transitions";
import type { CreateMarketplaceOrderInput } from "@/lib/validators/order";
import type { NewOrderEmailPayload } from "@/lib/email/resend";

const ACTIVE_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.IN_TRANSIT,
];

export async function resolveProviderByUserId(userId: string) {
  const provider = await prisma.provider.findUnique({ where: { userId } });
  if (!provider) {
    throw new ProviderNotFoundError("Perfil de proveedor no encontrado");
  }
  return provider;
}

function asOrderRecord(order: Prisma.OrderGetPayload<{ include: typeof orderDetailInclude }>): OrderRecord {
  return order;
}

function isUniqueConflict(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002"
  );
}

async function findOrderByIdempotency(providerId: string, idempotencyKey: string) {
  return prisma.order.findUnique({
    where: {
      providerId_idempotencyKey: { providerId, idempotencyKey },
    },
    include: orderDetailInclude,
  });
}

export async function createMarketplaceOrder(params: {
  clientId: string;
  clientName: string;
  clientPhone?: string | null;
  input: CreateMarketplaceOrderInput;
  idempotencyKey: string;
  ipAddress?: string;
}): Promise<{
  replay: boolean;
  order: ReturnType<typeof serializeOrder>;
  emailJob: NewOrderEmailPayload | null;
}> {
  const existing = await findOrderByIdempotency(
    params.input.providerId,
    params.idempotencyKey
  );
  if (existing) {
    return {
      replay: true,
      order: serializeOrder(asOrderRecord(existing)),
      emailJob: null,
    };
  }

  const [provider, client] = await Promise.all([
    prisma.provider.findFirst({
      where: { id: params.input.providerId, isActive: true },
      include: { user: { select: { email: true } } },
    }),
    prisma.user.findUnique({
      where: { id: params.clientId },
      select: { name: true, phone: true },
    }),
  ]);
  if (!provider) {
    throw new ProviderNotFoundError();
  }

  const lines = consolidateMarketplaceItems(
    params.input.items.map((item) => ({
      providerProductId: item.providerProductId,
      quantity: item.quantity,
      unitOfMeasure: item.unitOfMeasure,
    }))
  );

  const providerProducts = await prisma.providerProduct.findMany({
    where: { id: { in: lines.map((line) => line.providerProductId) } },
    include: { product: true },
  });
  const byId = new Map(providerProducts.map((pp) => [pp.id, pp]));

  const prepared = lines.map((line, index) => {
    const pp = byId.get(line.providerProductId);
    if (!pp) {
      throw new ProductUnavailableError();
    }
    if (pp.providerId !== provider.id) {
      throw new OrderValidationError("Validation failed", [
        {
          field: `items.${index}.providerProductId`,
          message: "El producto no pertenece a esta frutería",
        },
      ]);
    }
    if (!pp.isAvailable || !pp.product.isActive) {
      throw new ProductUnavailableError();
    }
    const unitPrice = toMoney(pp.price);
    const subtotal = lineSubtotal(unitPrice, line.quantity);
    return {
      index,
      providerProductId: pp.id,
      productId: pp.productId,
      itemName: pp.product.name,
      quantity: line.quantity,
      unitOfMeasure: line.unitOfMeasure,
      unitPrice,
      subtotal,
    };
  });

  const total = sumMoney(prepared.map((line) => line.subtotal));

  let created;
  try {
    created = await prisma.order.create({
      data: {
        clientId: params.clientId,
        providerId: provider.id,
        source: OrderSource.MARKETPLACE,
        status: OrderStatus.PENDING,
        paymentMethod: PaymentMethod.UNPAID,
        paidAt: null,
        notes: params.input.notes ?? null,
        idempotencyKey: params.idempotencyKey,
        total,
        items: {
          create: prepared.map((line) => ({
            providerProductId: line.providerProductId,
            productId: line.productId,
            itemName: line.itemName,
            quantity: line.quantity,
            unitOfMeasure: line.unitOfMeasure,
            unitPrice: line.unitPrice,
            subtotal: line.subtotal,
          })),
        },
      },
      include: orderDetailInclude,
    });
  } catch (err) {
    if (isUniqueConflict(err)) {
      const replayed = await findOrderByIdempotency(
        provider.id,
        params.idempotencyKey
      );
      if (replayed) {
        return {
          replay: true,
          order: serializeOrder(asOrderRecord(replayed)),
          emailJob: null,
        };
      }
    }
    throw err;
  }

  await writeAuditLog({
    module: SystemModule.ORDERS,
    action: AuditAction.CREATE,
    entityId: created.id,
    userId: params.clientId,
    ipAddress: params.ipAddress,
    details: {
      source: OrderSource.MARKETPLACE,
      status: OrderStatus.PENDING,
      itemCount: prepared.length,
      customLineCount: 0,
      capturedManually: false,
      total: formatMoney(total),
      paymentMethod: PaymentMethod.UNPAID,
      notificationFailed: false,
    },
  });

  const emailJob: NewOrderEmailPayload | null = provider.user.email
    ? {
        to: provider.user.email,
        businessName: provider.businessName,
        clientName: client?.name ?? params.clientName,
        clientPhone: client?.phone ?? params.clientPhone,
        total: formatMoney(total),
        items: prepared.map((line) => ({
          itemName: line.itemName,
          quantity: formatQuantity(line.quantity),
          unitOfMeasure: line.unitOfMeasure,
        })),
      }
    : null;

  return {
    replay: false,
    order: serializeOrder(asOrderRecord(created)),
    emailJob,
  };
}

export async function listClientOrders(params: {
  clientId: string;
  page: number;
  limit: number;
  skip: number;
  status?: OrderStatus;
}) {
  const where: Prisma.OrderWhereInput = {
    clientId: params.clientId,
    ...(params.status ? { status: params.status } : {}),
  };

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: orderDetailInclude,
      orderBy: { createdAt: "desc" },
      skip: params.skip,
      take: params.limit,
    }),
  ]);

  return {
    data: orders.map((order) =>
      serializeClientOrderSummary(asOrderRecord(order))
    ),
    meta: buildMeta(params.page, params.limit, total),
  };
}

function assertOrderAccess(
  order: OrderRecord,
  session: { sub: string; role: UserRole }
) {
  if (session.role === UserRole.ADMIN) return;
  if (session.role === UserRole.CLIENT && order.clientId === session.sub) return;
  if (session.role === UserRole.PROVIDER && order.provider.userId === session.sub) {
    return;
  }
  throw new OrderForbiddenError();
}

export async function getOrderById(params: {
  orderId: string;
  session: { sub: string; role: UserRole };
}) {
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: orderDetailInclude,
  });
  if (!order) {
    throw new OrderNotFoundError();
  }
  const record = asOrderRecord(order);
  assertOrderAccess(record, params.session);
  const includeClient =
    params.session.role === UserRole.PROVIDER ||
    params.session.role === UserRole.ADMIN;
  return serializeOrder(record, { includeClient });
}

export async function transitionStatus(params: {
  orderId: string;
  nextStatus: OrderStatus;
  session: { sub: string; role: UserRole };
  ipAddress?: string;
}) {
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: orderDetailInclude,
  });
  if (!order) {
    throw new OrderNotFoundError();
  }
  const record = asOrderRecord(order);
  assertOrderAccess(record, params.session);

  if (params.session.role === UserRole.CLIENT) {
    if (!canTransition(record.status, params.nextStatus, UserRole.CLIENT)) {
      throw new OrderForbiddenError();
    }
  } else if (!canTransition(record.status, params.nextStatus, params.session.role)) {
    throw new InvalidTransitionError();
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { status: params.nextStatus },
    include: orderDetailInclude,
  });
  await writeAuditLog({
    module: SystemModule.ORDERS,
    action: AuditAction.UPDATE,
    entityId: order.id,
    userId: params.session.sub,
    ipAddress: params.ipAddress,
    details: {
      from: record.status,
      to: params.nextStatus,
      source: record.source,
    },
  });

  const includeClient =
    params.session.role === UserRole.PROVIDER ||
    params.session.role === UserRole.ADMIN;
  return serializeOrder(asOrderRecord(updated), { includeClient });
}

export async function listProviderOrders(params: {
  userId: string;
  page: number;
  limit: number;
  skip: number;
  tab: "active" | "completed" | "cancelled";
  status?: OrderStatus;
  source?: OrderSource;
}) {
  const provider = await resolveProviderByUserId(params.userId);

  let statuses: OrderStatus[] | undefined;
  if (params.status) {
    statuses = [params.status];
  } else if (params.tab === "active") {
    statuses = ACTIVE_STATUSES;
  } else if (params.tab === "completed") {
    statuses = [OrderStatus.DELIVERED];
  } else {
    statuses = [OrderStatus.CANCELLED];
  }

  const where: Prisma.OrderWhereInput = {
    providerId: provider.id,
    status: { in: statuses },
    ...(params.source ? { source: params.source } : {}),
  };

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: orderDetailInclude,
      orderBy: { createdAt: "desc" },
      skip: params.skip,
      take: params.limit,
    }),
  ]);

  return {
    data: orders.map((order) =>
      serializeProviderOrderRow(asOrderRecord(order))
    ),
    meta: buildMeta(params.page, params.limit, total),
  };
}

export { findOrderByIdempotency };
