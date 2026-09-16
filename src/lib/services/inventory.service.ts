import {
  OrderSource,
  OrderStatus,
  Prisma,
  ProductUnit,
  UnitOfMeasure,
} from "@prisma/client";
import prisma from "@/lib/prisma";
import { findOwnedProvider } from "@/lib/providers/owned-provider";
import { ProviderNotFoundError } from "@/lib/services/provider.service";
import { CatalogForbiddenError } from "@/lib/services/local-product.service";
import { buildMeta } from "@/lib/services/pagination";
import { toDecimal } from "@/lib/money";
import { convertQtyToCatalog, formatOnHand } from "@/lib/inventory/convert-qty";
import { computeInventoryMetrics } from "@/lib/inventory/metrics";
import type { InventoryEntryInput, PatchInventoryInput } from "@/lib/validators/inventory";

export class InventoryValidationError extends Error {
  constructor(
    message: string,
    public details: { field: string; message: string }[]
  ) {
    super(message);
    this.name = "InventoryValidationError";
  }
}

type Tx = Prisma.TransactionClient;

async function requireOwnedProvider(userId: string, providerId: string) {
  const provider = await findOwnedProvider(userId, providerId);
  if (!provider) {
    throw new ProviderNotFoundError("Perfil de proveedor no encontrado");
  }
  return provider;
}

async function loadBranchProduct(providerId: string, providerProductId: string) {
  const row = await prisma.providerProduct.findUnique({
    where: { id: providerProductId },
    include: { product: true },
  });
  if (!row) {
    throw new CatalogForbiddenError();
  }
  if (row.providerId !== providerId) {
    throw new CatalogForbiddenError();
  }
  return row;
}

export async function sumReservedByProductIds(
  providerId: string,
  providerProductIds: string[],
  client: Tx | typeof prisma = prisma
): Promise<Map<string, Prisma.Decimal>> {
  const totals = new Map<string, Prisma.Decimal>();
  if (providerProductIds.length === 0) return totals;

  const items = await client.orderItem.findMany({
    where: {
      providerProductId: { in: providerProductIds },
      order: {
        providerId,
        source: OrderSource.MARKETPLACE,
        status: { notIn: [OrderStatus.DELIVERED, OrderStatus.CANCELLED] },
      },
    },
    select: {
      providerProductId: true,
      quantity: true,
      unitOfMeasure: true,
      product: { select: { unit: true } },
      providerProduct: { select: { product: { select: { unit: true } } } },
    },
  });

  for (const item of items) {
    if (!item.providerProductId) continue;
    const unit =
      item.providerProduct?.product.unit ?? item.product?.unit ?? ProductUnit.KG;
    const qty = convertQtyToCatalog(unit, item.unitOfMeasure, item.quantity);
    const prev = totals.get(item.providerProductId) ?? new Prisma.Decimal(0);
    totals.set(item.providerProductId, prev.plus(qty));
  }
  return totals;
}

function serializeItem(
  row: {
    id: string;
    productId: string;
    isAvailable: boolean;
    imageUrl: string | null;
    onHand: Prisma.Decimal;
    capacityMax: Prisma.Decimal | null;
    alertThresholdPercent: number;
    alertEnabled: boolean;
    boxContentFactor: Prisma.Decimal | null;
    product: { name: string; unit: ProductUnit; imageUrl: string | null };
  },
  reserved: Prisma.Decimal
) {
  const metrics = computeInventoryMetrics({
    onHand: row.onHand,
    reserved,
    capacityMax: row.capacityMax,
    alertThresholdPercent: row.alertThresholdPercent,
    alertEnabled: row.alertEnabled,
  });
  return {
    providerProductId: row.id,
    productId: row.productId,
    name: row.product.name,
    unit: row.product.unit,
    isAvailable: row.isAvailable,
    imageUrl: row.imageUrl ?? row.product.imageUrl,
    ...metrics,
    boxContentFactor: row.boxContentFactor ? formatOnHand(row.boxContentFactor) : null,
  };
}

export async function listInventory(params: {
  userId: string;
  providerId: string;
  page: number;
  limit: number;
  skip: number;
}) {
  await requireOwnedProvider(params.userId, params.providerId);
  const where = { providerId: params.providerId };
  const [total, rows] = await Promise.all([
    prisma.providerProduct.count({ where }),
    prisma.providerProduct.findMany({
      where,
      include: { product: true },
      orderBy: { createdAt: "asc" },
      skip: params.skip,
      take: params.limit,
    }),
  ]);
  const reserved = await sumReservedByProductIds(
    params.providerId,
    rows.map((row) => row.id)
  );
  return {
    data: rows.map((row) =>
      serializeItem(row, reserved.get(row.id) ?? new Prisma.Decimal(0))
    ),
    meta: buildMeta(params.page, params.limit, total),
  };
}

export async function getInventoryItem(params: {
  userId: string;
  providerId: string;
  providerProductId: string;
}) {
  await requireOwnedProvider(params.userId, params.providerId);
  const row = await loadBranchProduct(params.providerId, params.providerProductId);
  const reserved = await sumReservedByProductIds(params.providerId, [row.id]);
  return serializeItem(row, reserved.get(row.id) ?? new Prisma.Decimal(0));
}

export async function patchInventoryItem(params: {
  userId: string;
  providerId: string;
  providerProductId: string;
  input: PatchInventoryInput;
}) {
  await requireOwnedProvider(params.userId, params.providerId);
  await loadBranchProduct(params.providerId, params.providerProductId);

  const updated = await prisma.providerProduct.update({
    where: { id: params.providerProductId },
    data: {
      ...(params.input.capacityMax !== undefined
        ? {
            capacityMax:
              params.input.capacityMax === null
                ? null
                : toDecimal(params.input.capacityMax),
          }
        : {}),
      ...(params.input.alertThresholdPercent !== undefined
        ? { alertThresholdPercent: params.input.alertThresholdPercent }
        : {}),
      ...(params.input.alertEnabled !== undefined
        ? { alertEnabled: params.input.alertEnabled }
        : {}),
      ...(params.input.boxContentFactor !== undefined
        ? {
            boxContentFactor:
              params.input.boxContentFactor === null
                ? null
                : toDecimal(params.input.boxContentFactor),
          }
        : {}),
    },
    include: { product: true },
  });
  const reserved = await sumReservedByProductIds(params.providerId, [updated.id]);
  return serializeItem(updated, reserved.get(updated.id) ?? new Prisma.Decimal(0));
}

export async function addInventoryEntry(params: {
  userId: string;
  providerId: string;
  providerProductId: string;
  input: InventoryEntryInput;
}) {
  await requireOwnedProvider(params.userId, params.providerId);
  const row = await loadBranchProduct(params.providerId, params.providerProductId);
  const qty = toDecimal(params.input.quantity);
  let delta = qty;
  if (params.input.receiveAs === "BOX") {
    if (!row.boxContentFactor || toDecimal(row.boxContentFactor).lte(0)) {
      throw new InventoryValidationError("Datos inválidos", [
        {
          field: "receiveAs",
          message: "Define un factor de caja mayor que cero",
        },
      ]);
    }
    delta = qty.times(row.boxContentFactor);
  }
  delta = delta.toDecimalPlaces(3, Prisma.Decimal.ROUND_HALF_EVEN);

  const updated = await prisma.providerProduct.update({
    where: { id: row.id },
    data: { onHand: { increment: delta } },
    include: { product: true },
  });
  const reserved = await sumReservedByProductIds(params.providerId, [updated.id]);
  return serializeItem(updated, reserved.get(updated.id) ?? new Prisma.Decimal(0));
}

export async function decrementOnHandForLines(
  tx: Tx,
  providerId: string,
  lines: Array<{
    providerProductId: string | null;
    quantity: Prisma.Decimal | string | number;
    unitOfMeasure: UnitOfMeasure;
    productUnit?: ProductUnit;
  }>
) {
  const catalogLines = lines.filter((line) => line.providerProductId);
  if (catalogLines.length === 0) return;

  const ids = [...new Set(catalogLines.map((line) => line.providerProductId!))];
  const products = await tx.providerProduct.findMany({
    where: { id: { in: ids }, providerId },
    include: { product: true },
  });
  const byId = new Map(products.map((pp) => [pp.id, pp]));

  const deltas = new Map<string, Prisma.Decimal>();
  for (const line of catalogLines) {
    const pp = byId.get(line.providerProductId!);
    if (!pp) continue;
    const unit = line.productUnit ?? pp.product.unit;
    const qty = convertQtyToCatalog(unit, line.unitOfMeasure, line.quantity);
    deltas.set(pp.id, (deltas.get(pp.id) ?? new Prisma.Decimal(0)).plus(qty));
  }

  for (const [id, delta] of deltas) {
    if (delta.eq(0)) continue;
    await tx.providerProduct.update({
      where: { id },
      data: { onHand: { decrement: delta } },
    });
  }
}

export function catalogBarFields(
  row: {
    onHand: Prisma.Decimal;
    capacityMax: Prisma.Decimal | null;
    alertThresholdPercent: number;
    alertEnabled: boolean;
  } | null,
  reserved: Prisma.Decimal
) {
  if (!row) return null;
  try {
    return computeInventoryMetrics({
      onHand: row.onHand,
      reserved,
      capacityMax: row.capacityMax,
      alertThresholdPercent: row.alertThresholdPercent,
      alertEnabled: row.alertEnabled,
    });
  } catch {
    return {
      onHand: formatOnHand(row.onHand),
      reserved: formatOnHand(reserved),
      capacityMax: row.capacityMax ? formatOnHand(row.capacityMax) : null,
      fillPercent: null,
      alertThresholdPercent: row.alertThresholdPercent,
      alertEnabled: row.alertEnabled,
      lowStockAlert: null as boolean | null,
    };
  }
}
