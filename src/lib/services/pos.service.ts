import {
  AuditAction,
  OrderSource,
  OrderStatus,
  PaymentMethod,
  Prisma,
  SystemModule,
} from "@prisma/client";
import prisma from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { formatMoney, lineSubtotal, sumMoney, toMoney, toQuantity } from "@/lib/money";
import {
  OrderValidationError,
  ProductUnavailableError,
} from "@/lib/orders/errors";
import {
  orderDetailInclude,
  serializeOrder,
  type OrderRecord,
} from "@/lib/orders/serialize";
import type { CreatePosSaleInput } from "@/lib/validators/order";
import { resolveProviderByUserId } from "@/lib/services/order.service";

export async function createPosSale(params: {
  userId: string;
  input: CreatePosSaleInput;
  idempotencyKey: string;
  ipAddress?: string;
}): Promise<{ replay: boolean; order: ReturnType<typeof serializeOrder> }> {
  const provider = await resolveProviderByUserId(params.userId);

  const existing = await prisma.order.findUnique({
    where: {
      providerId_idempotencyKey: {
        providerId: provider.id,
        idempotencyKey: params.idempotencyKey,
      },
    },
    include: orderDetailInclude,
  });
  if (existing) {
    return {
      replay: true,
      order: serializeOrder(existing as OrderRecord),
    };
  }

  if (
    params.input.status === OrderStatus.DELIVERED &&
    params.input.paymentMethod === PaymentMethod.UNPAID
  ) {
    throw new OrderValidationError("Validation failed", [
      {
        field: "paymentMethod",
        message: "Una venta cerrada debe cobrar (CASH u OTHER)",
      },
    ]);
  }

  const catalogIds = params.input.items
    .map((item) => item.providerProductId)
    .filter((id): id is string => Boolean(id));

  const providerProducts = catalogIds.length
    ? await prisma.providerProduct.findMany({
        where: { id: { in: catalogIds } },
        include: { product: true },
      })
    : [];
  const byId = new Map(providerProducts.map((pp) => [pp.id, pp]));

  const prepared = params.input.items.map((item) => {
    if (item.customItem) {
      const unitPrice = toMoney(item.customItem.unitPrice);
      const quantity = toQuantity(item.quantity);
      return {
        providerProductId: null as string | null,
        productId: null as string | null,
        itemName: item.customItem.name,
        quantity,
        unitOfMeasure: item.unitOfMeasure,
        unitPrice,
        subtotal: lineSubtotal(unitPrice, quantity),
      };
    }

    const pp = byId.get(item.providerProductId!);
    if (!pp || pp.providerId !== provider.id) {
      throw new ProductUnavailableError();
    }
    if (!pp.isAvailable || !pp.product.isActive) {
      throw new ProductUnavailableError();
    }
    const unitPrice = toMoney(pp.price);
    const quantity = toQuantity(item.quantity);
    return {
      providerProductId: pp.id,
      productId: pp.productId,
      itemName: pp.product.name,
      quantity,
      unitOfMeasure: item.unitOfMeasure,
      unitPrice,
      subtotal: lineSubtotal(unitPrice, quantity),
    };
  });

  const total = sumMoney(prepared.map((line) => line.subtotal));
  const customLineCount = prepared.filter((line) => !line.providerProductId).length;
  const paidAt =
    params.input.paymentMethod === PaymentMethod.UNPAID ? null : new Date();

  let created;
  try {
    created = await prisma.order.create({
      data: {
        clientId: null,
        customerName: params.input.customerName ?? null,
        providerId: provider.id,
        source: OrderSource.POS,
        status: params.input.status,
        paymentMethod: params.input.paymentMethod,
        paidAt,
        notes: null,
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
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const replayed = await prisma.order.findUnique({
        where: {
          providerId_idempotencyKey: {
            providerId: provider.id,
            idempotencyKey: params.idempotencyKey,
          },
        },
        include: orderDetailInclude,
      });
      if (replayed) {
        return {
          replay: true,
          order: serializeOrder(replayed as OrderRecord),
        };
      }
    }
    throw err;
  }

  await writeAuditLog({
    module: SystemModule.ORDERS,
    action: AuditAction.CREATE,
    entityId: created.id,
    userId: params.userId,
    ipAddress: params.ipAddress,
    details: {
      source: OrderSource.POS,
      status: params.input.status,
      itemCount: prepared.length,
      customLineCount,
      capturedManually: customLineCount > 0,
      total: formatMoney(total),
      paymentMethod: params.input.paymentMethod,
      notificationFailed: false,
    },
  });

  return {
    replay: false,
    order: serializeOrder(created as OrderRecord),
  };
}
