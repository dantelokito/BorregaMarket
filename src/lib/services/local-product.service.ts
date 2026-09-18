import { AuditAction, ProductScope, Prisma, SystemModule } from "@prisma/client";
import prisma from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { assertRateLimit } from "@/lib/rate-limit/token-bucket";
import { slugify } from "@/lib/validation/plain-text";
import { ProviderNotFoundError } from "@/lib/services/provider.service";
import { findOwnedProvider } from "@/lib/providers/owned-provider";
import { toDecimal } from "@/lib/money";
import {
  assertCajaFactor,
  assertPublishablePrice,
  assertUnitFactorChangeAllowed,
  insertPriceHistory,
} from "@/lib/catalog/offer";
import { sumReservedByProductIds } from "@/lib/services/inventory.service";
import type {
  CreateLocalProductInput,
  PatchLocalProductInput,
} from "@/lib/validators/catalog-f10";

export class CatalogForbiddenError extends Error {
  constructor(message = "Acceso denegado") {
    super(message);
    this.name = "CatalogForbiddenError";
  }
}

export class CatalogNotFoundError extends Error {
  constructor(message = "Recurso no encontrado") {
    super(message);
    this.name = "CatalogNotFoundError";
  }
}

export class CatalogConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogConflictError";
  }
}

export class WrongProductRouteError extends Error {
  constructor(
    message = "Usa PATCH /api/provider/products para el catálogo global"
  ) {
    super(message);
    this.name = "WrongProductRouteError";
  }
}

async function uniqueLocalSlug(providerId: string, name: string): Promise<string> {
  const base = slugify(name);
  let slug = base;
  let n = 2;
  for (;;) {
    const hit = await prisma.product.findFirst({
      where: { scope: ProductScope.LOCAL, ownerProviderId: providerId, slug },
      select: { id: true },
    });
    if (!hit) return slug;
    slug = `${base}-${n}`;
    n += 1;
  }
}

function serializeLocal(row: {
  id: string;
  price: { toString(): string } | number;
  isAvailable: boolean;
  sectionId: string | null;
  imageUrl: string | null;
  product: {
    id: string;
    name: string;
    slug: string;
    unit: string;
    imageUrl: string | null;
  };
}) {
  return {
    providerProductId: row.id,
    productId: row.product.id,
    scope: "LOCAL" as const,
    name: row.product.name,
    slug: row.product.slug,
    unit: row.product.unit,
    price: Number(row.price),
    isAvailable: row.isAvailable,
    sectionId: row.sectionId,
    imageUrl: row.imageUrl ?? row.product.imageUrl,
  };
}

export async function createLocalProduct(params: {
  userId: string;
  providerId?: string;
  input: CreateLocalProductInput;
  ipAddress?: string;
}) {
  const provider = await findOwnedProvider(params.userId, params.providerId);
  if (!provider) throw new ProviderNotFoundError("Perfil de proveedor no encontrado");

  assertRateLimit(`local-product:${provider.id}`, 30, 60 * 60 * 1000);

  const section = await prisma.providerSection.findUnique({
    where: { id: params.input.sectionId },
  });
  if (!section) throw new CatalogNotFoundError("Sección no encontrada");
  if (section.providerId !== provider.id) throw new CatalogForbiddenError();

  const slug = await uniqueLocalSlug(provider.id, params.input.name);
  const factor =
    params.input.boxContentFactor === undefined
      ? null
      : toDecimal(params.input.boxContentFactor);
  assertCajaFactor(params.input.unit, factor);
  assertPublishablePrice(params.input.price, params.input.isAvailable ?? true);

  const created = await prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        name: params.input.name,
        slug,
        description: params.input.description ?? null,
        category: null,
        unit: params.input.unit,
        isActive: true,
        scope: ProductScope.LOCAL,
        ownerProviderId: provider.id,
      },
    });
    const pp = await tx.providerProduct.create({
      data: {
        providerId: provider.id,
        productId: product.id,
        price: toDecimal(params.input.price),
        isAvailable: params.input.isAvailable ?? true,
        sectionId: section.id,
        saleUnit: params.input.unit,
        boxContentFactor: factor,
      },
      include: { product: true },
    });
    await insertPriceHistory(tx, {
      providerProductId: pp.id,
      price: pp.price,
      previousPrice: null,
      changedByUserId: params.userId,
    });
    return pp;
  });

  await writeAuditLog({
    module: SystemModule.PRODUCTS,
    action: AuditAction.CREATE,
    entityId: created.id,
    userId: params.userId,
    ipAddress: params.ipAddress,
    details: { scope: "LOCAL", name: created.product.name, productId: created.productId },
  });

  return serializeLocal(created);
}

export async function updateLocalProduct(params: {
  userId: string;
  providerId?: string;
  providerProductId: string;
  input: PatchLocalProductInput;
  ipAddress?: string;
}) {
  const provider = await findOwnedProvider(params.userId, params.providerId);
  if (!provider) throw new ProviderNotFoundError("Perfil de proveedor no encontrado");

  let row = await prisma.providerProduct.findUnique({
    where: { id: params.providerProductId },
    include: { product: true },
  });
  if (!row) {
    const product = await prisma.product.findUnique({ where: { id: params.providerProductId } });
    if (!product) throw new CatalogNotFoundError("Producto no encontrado");
    if (product.scope !== ProductScope.LOCAL) throw new WrongProductRouteError();
    if (product.ownerProviderId !== provider.id) throw new CatalogForbiddenError();
    row = await prisma.providerProduct.findUnique({
      where: { providerId_productId: { providerId: provider.id, productId: product.id } },
      include: { product: true },
    });
    if (!row) throw new CatalogNotFoundError("Producto no encontrado");
  }
  if (row.providerId !== provider.id) throw new CatalogForbiddenError();
  if (row.product.scope !== ProductScope.LOCAL) throw new WrongProductRouteError();

  if (params.input.sectionId) {
    const section = await prisma.providerSection.findUnique({
      where: { id: params.input.sectionId },
    });
    if (!section) throw new CatalogNotFoundError("Sección no encontrada");
    if (section.providerId !== provider.id) throw new CatalogForbiddenError();
  }

  let nextSlug: string | undefined;
  if (params.input.name && params.input.name !== row.product.name) {
    const candidate = slugify(params.input.name);
    const clash = await prisma.product.findFirst({
      where: {
        scope: ProductScope.LOCAL,
        ownerProviderId: provider.id,
        slug: candidate,
        id: { not: row.productId },
      },
    });
    if (!clash) nextSlug = candidate;
  }

  const nextMasterUnit = params.input.unit ?? row.product.unit;
  const nextSaleUnit =
    params.input.saleUnit !== undefined
      ? params.input.saleUnit
      : params.input.unit !== undefined
        ? params.input.unit
        : row.saleUnit;
  const nextFactor =
    params.input.boxContentFactor !== undefined
      ? params.input.boxContentFactor === null
        ? null
        : toDecimal(params.input.boxContentFactor)
      : row.boxContentFactor;
  const effective = nextSaleUnit ?? nextMasterUnit;
  assertCajaFactor(effective, nextFactor);

  const unitOrFactorChanged =
    (params.input.unit !== undefined && params.input.unit !== row.product.unit) ||
    (params.input.saleUnit !== undefined && params.input.saleUnit !== row.saleUnit) ||
    (params.input.boxContentFactor !== undefined &&
      String(params.input.boxContentFactor ?? "") !== String(row.boxContentFactor ?? ""));

  const reserved =
    (await sumReservedByProductIds(provider.id, [row.id])).get(row.id) ?? new Prisma.Decimal(0);
  const { discardOnHand } = assertUnitFactorChangeAllowed({
    reserved,
    onHand: row.onHand,
    unitOrFactorChanged,
    confirmDiscard: params.input.confirmDiscard,
  });

  const nextAvailable = params.input.isAvailable ?? row.isAvailable;
  const nextPrice =
    params.input.price !== undefined ? toDecimal(params.input.price) : row.price;
  assertPublishablePrice(nextPrice, nextAvailable);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: row.productId },
      data: {
        ...(params.input.name !== undefined ? { name: params.input.name } : {}),
        ...(nextSlug ? { slug: nextSlug } : {}),
        ...(params.input.unit !== undefined ? { unit: params.input.unit } : {}),
        ...(params.input.description !== undefined
          ? { description: params.input.description }
          : {}),
      },
    });
    const next = await tx.providerProduct.update({
      where: { id: row.id },
      data: {
        ...(params.input.price !== undefined ? { price: toDecimal(params.input.price) } : {}),
        ...(params.input.isAvailable !== undefined
          ? { isAvailable: params.input.isAvailable }
          : {}),
        ...(params.input.sectionId !== undefined ? { sectionId: params.input.sectionId } : {}),
        saleUnit: nextSaleUnit,
        ...(params.input.boxContentFactor !== undefined ? { boxContentFactor: nextFactor } : {}),
        ...(discardOnHand ? { onHand: 0 } : {}),
      },
      include: { product: true },
    });
    if (params.input.price !== undefined && !toDecimal(params.input.price).eq(row.price)) {
      await insertPriceHistory(tx, {
        providerProductId: next.id,
        price: next.price,
        previousPrice: row.price,
        changedByUserId: params.userId,
      });
    }
    return next;
  });

  const action =
    params.input.isAvailable === false
      ? AuditAction.DISABLE
      : params.input.isAvailable === true
        ? AuditAction.ENABLE
        : AuditAction.UPDATE;

  await writeAuditLog({
    module: SystemModule.PRODUCTS,
    action,
    entityId: updated.id,
    userId: params.userId,
    ipAddress: params.ipAddress,
    details: { ...params.input },
  });

  return serializeLocal(updated);
}
