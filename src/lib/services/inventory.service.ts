import {
  AuditAction,
  InventoryEntryKind,
  OrderSource,
  OrderStatus,
  Prisma,
  ProductUnit,
  SystemModule,
  UnitOfMeasure,
} from "@prisma/client";
import prisma from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { findOwnedProvider } from "@/lib/providers/owned-provider";
import { ProviderNotFoundError } from "@/lib/services/provider.service";
import { CatalogForbiddenError } from "@/lib/services/local-product.service";
import { buildMeta } from "@/lib/services/pagination";
import { toDecimal } from "@/lib/money";
import { convertQtyToCatalog, formatOnHand } from "@/lib/inventory/convert-qty";
import { computeInventoryMetrics } from "@/lib/inventory/metrics";
import { effectiveSaleUnit } from "@/lib/catalog/sellable";
import {
  assertCajaFactor,
  assertUnitFactorChangeAllowed,
  OfferArchivedError,
} from "@/lib/catalog/offer";
import { inventoryEntryKindSchema } from "@/lib/validators/inventory";
import type {
  AdjustmentInput,
  InventoryEntryInput,
  PatchInventoryInput,
  ShrinkageInput,
} from "@/lib/validators/inventory";
import { addCalendarDays, monterreyDayStartUtc, ymdInTimeZone } from "@/lib/timezone";

export class InventoryValidationError extends Error {
  constructor(
    message: string,
    public details: { field: string; message: string }[]
  ) {
    super(message);
    this.name = "InventoryValidationError";
  }
}

export class InventoryNegativeError extends Error {
  code = "INVENTORY_NEGATIVE_NOT_ALLOWED";
  constructor(
    message = "La cantidad supera el saldo disponible",
    public details: { field: string; message: string }[] = [
      { field: "quantity", message: "La merma dejaría existencias negativas" },
    ]
  ) {
    super(message);
    this.name = "InventoryNegativeError";
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
      providerProduct: { select: { saleUnit: true, product: { select: { unit: true } } } },
    },
  });

  for (const item of items) {
    if (!item.providerProductId) continue;
    const unit = item.providerProduct
      ? effectiveSaleUnit(item.providerProduct.saleUnit, item.providerProduct.product.unit)
      : item.product?.unit ?? ProductUnit.KG;
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
    saleUnit: ProductUnit | null;
    archivedAt: Date | null;
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
  const effective = effectiveSaleUnit(row.saleUnit, row.product.unit);
  return {
    providerProductId: row.id,
    productId: row.productId,
    name: row.product.name,
    unit: effective,
    masterUnit: row.product.unit,
    saleUnit: row.saleUnit,
    effectiveSaleUnit: effective,
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
  const where = { providerId: params.providerId, archivedAt: null };
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
  const current = await loadBranchProduct(params.providerId, params.providerProductId);
  const reservedMap = await sumReservedByProductIds(params.providerId, [current.id]);
  const reserved = reservedMap.get(current.id) ?? new Prisma.Decimal(0);

  const factorChanged =
    params.input.boxContentFactor !== undefined &&
    String(params.input.boxContentFactor ?? "") !==
      String(current.boxContentFactor ?? "");

  const nextFactor =
    params.input.boxContentFactor === undefined
      ? current.boxContentFactor
      : params.input.boxContentFactor === null
        ? null
        : toDecimal(params.input.boxContentFactor);

  const nextUnit = effectiveSaleUnit(current.saleUnit, current.product.unit);
  if (factorChanged) {
    assertCajaFactor(nextUnit, nextFactor);
  }
  const { discardOnHand } = assertUnitFactorChangeAllowed({
    reserved,
    onHand: current.onHand,
    unitOrFactorChanged: factorChanged,
    confirmDiscard: params.input.confirmDiscard,
  });

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
        ? { boxContentFactor: nextFactor }
        : {}),
      ...(discardOnHand ? { onHand: 0 } : {}),
    },
    include: { product: true },
  });
  const reservedAfter = await sumReservedByProductIds(params.providerId, [updated.id]);
  return serializeItem(updated, reservedAfter.get(updated.id) ?? new Prisma.Decimal(0));
}

export async function addInventoryEntry(params: {
  userId: string;
  providerId: string;
  providerProductId: string;
  input: InventoryEntryInput;
}) {
  await requireOwnedProvider(params.userId, params.providerId);
  const row = await loadBranchProduct(params.providerId, params.providerProductId);
  if (row.archivedAt) {
    throw new OfferArchivedError();
  }
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

  const updated = await prisma.$transaction(async (tx) => {
    const current = await tx.providerProduct.findUnique({ where: { id: row.id } });
    const onHandAfter = (current?.onHand ?? row.onHand).plus(delta);
    const entry = await tx.inventoryEntry.create({
      data: {
        providerProductId: row.id,
        kind: InventoryEntryKind.ENTRADA,
        quantity: qty,
        receiveAs: params.input.receiveAs ?? "CATALOG",
        appliedDelta: delta,
        onHandAfter,
      },
    });
    const next = await tx.providerProduct.update({
      where: { id: row.id },
      data: { onHand: onHandAfter },
      include: { product: true },
    });
    return { next, lastEntryId: entry.id };
  });
  const reserved = await sumReservedByProductIds(params.providerId, [updated.next.id]);
  return {
    ...serializeItem(updated.next, reserved.get(updated.next.id) ?? new Prisma.Decimal(0)),
    lastEntryId: updated.lastEntryId,
  };
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
    const unit = line.productUnit ?? effectiveSaleUnit(pp.saleUnit, pp.product.unit);
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

function serializeMovement(entry: {
  id: string;
  providerProductId: string;
  kind: InventoryEntryKind;
  quantity: Prisma.Decimal;
  receiveAs: string | null;
  appliedDelta: Prisma.Decimal;
  onHandAfter: Prisma.Decimal | null;
  reason: string | null;
  note: string | null;
  createdAt: Date;
  providerProduct: { product: { name: string } };
}) {
  return {
    id: entry.id,
    providerProductId: entry.providerProductId,
    productName: entry.providerProduct.product.name,
    kind: entry.kind,
    quantity: formatOnHand(entry.quantity),
    receiveAs: entry.receiveAs,
    appliedDelta: formatOnHand(entry.appliedDelta),
    onHandAfter: entry.onHandAfter ? formatOnHand(entry.onHandAfter) : null,
    reason: entry.reason,
    note: entry.note,
    createdAt: entry.createdAt.toISOString(),
  };
}

async function requireOwnedOffer(params: {
  userId: string;
  providerId: string;
  providerProductId: string;
}) {
  await requireOwnedProvider(params.userId, params.providerId);
  const row = await loadBranchProduct(params.providerId, params.providerProductId);
  if (row.archivedAt) {
    throw new OfferArchivedError();
  }
  return row;
}

export async function addShrinkage(params: {
  userId: string;
  providerId: string;
  providerProductId: string;
  input: ShrinkageInput;
  ipAddress?: string;
}) {
  const row = await requireOwnedOffer(params);
  const qty = toDecimal(params.input.quantity).toDecimalPlaces(3, Prisma.Decimal.ROUND_HALF_EVEN);
  const note = params.input.note === undefined ? null : params.input.note;

  const result = await prisma.$transaction(async (tx) => {
    const current = await tx.providerProduct.findUnique({ where: { id: row.id } });
    if (!current) throw new CatalogForbiddenError();
    const onHandAfter = current.onHand.minus(qty);
    if (onHandAfter.lt(0)) {
      throw new InventoryNegativeError();
    }
    const entry = await tx.inventoryEntry.create({
      data: {
        providerProductId: row.id,
        kind: InventoryEntryKind.MERMA,
        quantity: qty,
        receiveAs: null,
        appliedDelta: qty.negated(),
        onHandAfter,
        reason: params.input.reason,
        note,
      },
    });
    const next = await tx.providerProduct.update({
      where: { id: row.id },
      data: { onHand: onHandAfter },
    });
    return { entry, next };
  });

  await writeAuditLog({
    module: SystemModule.PRODUCTS,
    action: AuditAction.UPDATE,
    entityId: row.id,
    userId: params.userId,
    ipAddress: params.ipAddress,
    details: { kind: "MERMA", quantity: formatOnHand(qty), reason: params.input.reason },
  });

  const onHand = formatOnHand(result.next.onHand);
  return {
    id: result.entry.id,
    providerProductId: row.id,
    kind: InventoryEntryKind.MERMA,
    quantity: formatOnHand(qty),
    appliedDelta: formatOnHand(qty.negated()),
    onHandAfter: onHand,
    reason: params.input.reason,
    note,
    createdAt: result.entry.createdAt.toISOString(),
    onHand,
  };
}

export async function addAdjustment(params: {
  userId: string;
  providerId: string;
  providerProductId: string;
  input: AdjustmentInput;
  ipAddress?: string;
}) {
  const row = await requireOwnedOffer(params);
  const counted = toDecimal(params.input.countedOnHand).toDecimalPlaces(
    3,
    Prisma.Decimal.ROUND_HALF_EVEN
  );
  if (counted.lt(0)) {
    throw new InventoryValidationError("Datos inválidos", [
      { field: "countedOnHand", message: "El conteo debe ser mayor o igual a cero" },
    ]);
  }
  const note = params.input.note === undefined ? null : params.input.note;

  const result = await prisma.$transaction(async (tx) => {
    const current = await tx.providerProduct.findUnique({ where: { id: row.id } });
    if (!current) throw new CatalogForbiddenError();
    const onHandAfter = counted;
    if (onHandAfter.lt(0)) {
      throw new InventoryNegativeError("La cantidad supera el saldo disponible", [
        { field: "countedOnHand", message: "El ajuste dejaría existencias negativas" },
      ]);
    }
    const appliedDelta = counted.minus(current.onHand);
    const entry = await tx.inventoryEntry.create({
      data: {
        providerProductId: row.id,
        kind: InventoryEntryKind.AJUSTE,
        quantity: counted,
        receiveAs: null,
        appliedDelta,
        onHandAfter,
        reason: null,
        note,
      },
    });
    const next = await tx.providerProduct.update({
      where: { id: row.id },
      data: { onHand: onHandAfter },
    });
    return { entry, next, appliedDelta };
  });

  await writeAuditLog({
    module: SystemModule.PRODUCTS,
    action: AuditAction.UPDATE,
    entityId: row.id,
    userId: params.userId,
    ipAddress: params.ipAddress,
    details: { kind: "AJUSTE", countedOnHand: formatOnHand(counted) },
  });

  const onHand = formatOnHand(result.next.onHand);
  return {
    id: result.entry.id,
    providerProductId: row.id,
    kind: InventoryEntryKind.AJUSTE,
    quantity: formatOnHand(counted),
    appliedDelta: formatOnHand(result.appliedDelta),
    onHandAfter: onHand,
    reason: null,
    note,
    createdAt: result.entry.createdAt.toISOString(),
    onHand,
  };
}

function isValidYmd(ymd: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false;
  const [year, month, day] = ymd.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  return (
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === day
  );
}

function inclusiveDaySpan(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const start = Date.UTC(fy, fm - 1, fd);
  const end = Date.UTC(ty, tm - 1, td);
  return Math.floor((end - start) / 86_400_000) + 1;
}

export function parseInventoryMovementQuery(
  search: URLSearchParams,
  now: Date = new Date()
) {
  const kindRaw = search.get("kind");
  const kindParsed = kindRaw
    ? inventoryEntryKindSchema.safeParse(kindRaw)
    : { success: true as const, data: undefined };
  if (!kindParsed.success) {
    throw new InventoryValidationError("Datos inválidos", [
      { field: "kind", message: "kind debe ser ENTRADA, MERMA o AJUSTE" },
    ]);
  }

  const providerProductIdRaw = search.get("providerProductId");
  const providerProductId =
    providerProductIdRaw && providerProductIdRaw.length > 0 ? providerProductIdRaw : undefined;

  const fromRaw = search.get("from");
  const toRaw = search.get("to");
  const hasFrom = Boolean(fromRaw);
  const hasTo = Boolean(toRaw);
  if (hasFrom !== hasTo) {
    throw new InventoryValidationError("Datos inválidos", [
      { field: hasFrom ? "to" : "from", message: "from y to deben enviarse juntos" },
    ]);
  }

  let from: string | undefined;
  let to: string | undefined;
  if (hasFrom && hasTo) {
    from = fromRaw!;
    to = toRaw!;
    if (!isValidYmd(from)) {
      throw new InventoryValidationError("Datos inválidos", [
        { field: "from", message: "Formato inválido" },
      ]);
    }
    if (!isValidYmd(to)) {
      throw new InventoryValidationError("Datos inválidos", [
        { field: "to", message: "Formato inválido" },
      ]);
    }
    if (from > to) {
      throw new InventoryValidationError("Datos inválidos", [
        { field: "from", message: "from no puede ser posterior a to" },
      ]);
    }
    if (inclusiveDaySpan(from, to) > 366) {
      throw new InventoryValidationError("Datos inválidos", [
        { field: "to", message: "El rango no puede superar 366 días" },
      ]);
    }
    const today = ymdInTimeZone(now);
    if (from > today || to > today) {
      throw new InventoryValidationError("Datos inválidos", [
        { field: to > today ? "to" : "from", message: "El periodo no puede ser futuro" },
      ]);
    }
  }

  return {
    kind: kindParsed.data,
    providerProductId,
    from,
    to,
  };
}

export async function listInventoryMovements(params: {
  userId: string;
  providerId: string;
  page: number;
  limit: number;
  skip: number;
  kind?: InventoryEntryKind;
  providerProductId?: string;
  from?: string;
  to?: string;
}) {
  await requireOwnedProvider(params.userId, params.providerId);
  if (params.providerProductId) {
    await loadBranchProduct(params.providerId, params.providerProductId);
  }

  const where: Prisma.InventoryEntryWhereInput = {
    providerProduct: { providerId: params.providerId },
    kind: params.kind ?? { in: [InventoryEntryKind.ENTRADA, InventoryEntryKind.MERMA, InventoryEntryKind.AJUSTE] },
    ...(params.providerProductId ? { providerProductId: params.providerProductId } : {}),
    ...(params.from && params.to
      ? {
          createdAt: {
            gte: monterreyDayStartUtc(params.from),
            lt: monterreyDayStartUtc(addCalendarDays(params.to, 1)),
          },
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.inventoryEntry.count({ where }),
    prisma.inventoryEntry.findMany({
      where,
      include: { providerProduct: { include: { product: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
      skip: params.skip,
      take: params.limit,
    }),
  ]);

  return {
    data: rows.map(serializeMovement),
    meta: buildMeta(params.page, params.limit, total),
  };
}
