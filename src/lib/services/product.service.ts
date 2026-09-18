import { AuditAction, Prisma, ProductScope, ProductUnit, SystemModule } from "@prisma/client";
import prisma from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { ProviderNotFoundError } from "@/lib/services/provider.service";
import { findOwnedProvider } from "@/lib/providers/owned-provider";
import {
  CatalogForbiddenError,
  CatalogNotFoundError,
  WrongProductRouteError,
} from "@/lib/services/local-product.service";
import { catalogBarFields, sumReservedByProductIds } from "@/lib/services/inventory.service";
import { buildMeta } from "@/lib/services/pagination";
import { toDecimal } from "@/lib/money";
import { formatOfferPrice } from "@/lib/catalog/sellable";
import {
  assertCajaFactor,
  assertPublishablePrice,
  assertUnitFactorChangeAllowed,
  insertPriceHistory,
  offerPanelFields,
  RestoreOfferNotFoundError,
} from "@/lib/catalog/offer";

export interface UpsertProviderProductInput {
  productId: string;
  isAvailable: boolean;
  price?: number;
  sectionId?: string;
}

export async function getProviderCatalog(
  userId: string,
  providerId?: string,
  opts?: { archived?: boolean; page?: number; limit?: number; skip?: number }
) {
  const provider = await findOwnedProvider(userId, providerId);
  if (!provider) {
    throw new ProviderNotFoundError("Perfil de proveedor no encontrado");
  }

  const archivedOnly = opts?.archived === true;
  const page = opts?.page ?? 1;
  const limit = opts?.limit ?? 50;
  const skip = opts?.skip ?? 0;

  const [allProducts, providerProducts] = await Promise.all([
    prisma.product.findMany({
      where: archivedOnly
        ? {
            providerProducts: {
              some: { providerId: provider.id, archivedAt: { not: null } },
            },
          }
        : {
            OR: [
              { scope: ProductScope.GLOBAL, isActive: true },
              { scope: ProductScope.LOCAL, ownerProviderId: provider.id },
            ],
          },
    }),
    prisma.providerProduct.findMany({
      where: { providerId: provider.id },
      include: { section: true },
    }),
  ]);

  const ppMap = new Map(providerProducts.map((pp) => [pp.productId, pp]));

  let catalog = allProducts
    .map((product) => {
      const pp = ppMap.get(product.id);
      if (archivedOnly) {
        if (!pp?.archivedAt) return null;
      } else if (pp?.archivedAt) {
        return null;
      }
      const f13 = pp
        ? offerPanelFields({
            archivedAt: pp.archivedAt,
            saleUnit: pp.saleUnit,
            boxContentFactor: pp.boxContentFactor,
            product,
            providerId: provider.id,
          })
        : {
            archivedAt: null,
            saleUnit: null,
            effectiveSaleUnit: product.unit,
            boxContentFactor: null,
            canEditMaster:
              product.scope === ProductScope.LOCAL && product.ownerProviderId === provider.id,
          };
      return {
        product: {
          id: product.id,
          name: product.name,
          slug: product.slug,
          category: product.category,
          unit: product.unit,
          description: product.description,
          imageUrl: pp?.imageUrl ?? product.imageUrl,
        },
        price: pp ? Number(pp.price) : null,
        isAvailable: pp?.isAvailable ?? false,
        providerProductId: pp?.id ?? null,
        scope: product.scope,
        sectionId: pp?.sectionId ?? null,
        sectionName: pp?.section?.name ?? null,
        imageUrl: pp?.imageUrl ?? product.imageUrl,
        sortOrder: pp?.section?.sortOrder ?? Number.MAX_SAFE_INTEGER,
        ...f13,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  catalog.sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.product.name.localeCompare(b.product.name, "es");
  });

  const total = catalog.length;
  catalog = catalog.slice(skip, skip + limit);

  const instanceIds = catalog
    .map((row) => row.providerProductId)
    .filter((id): id is string => Boolean(id));
  const reservedMap = await sumReservedByProductIds(provider.id, instanceIds);

  return {
    provider: {
      id: provider.id,
      businessName: provider.businessName,
    },
    catalog: catalog.map(({ sortOrder: _s, ...row }) => {
      const pp = ppMap.get(row.product.id);
      if (!pp) return row;
      const bar = catalogBarFields(pp, reservedMap.get(pp.id) ?? new Prisma.Decimal(0));
      if (!bar) return row;
      return {
        ...row,
        onHand: bar.onHand,
        capacityMax: bar.capacityMax,
        fillPercent: bar.fillPercent,
        alertThresholdPercent: bar.alertThresholdPercent,
        alertEnabled: bar.alertEnabled,
        lowStockAlert: bar.lowStockAlert,
        reserved: bar.reserved,
      };
    }),
    meta: buildMeta(page, limit, total),
  };
}

export async function upsertProviderProduct(
  userId: string,
  input: UpsertProviderProductInput,
  ipAddress?: string,
  providerId?: string
) {
  const provider = await findOwnedProvider(userId, providerId);
  if (!provider) {
    throw new ProviderNotFoundError("Perfil de proveedor no encontrado");
  }

  const product = await prisma.product.findUnique({ where: { id: input.productId } });
  if (!product) {
    throw new CatalogNotFoundError("Producto no encontrado");
  }
  if (product.scope === ProductScope.LOCAL) {
    if (product.ownerProviderId !== provider.id) {
      throw new CatalogForbiddenError();
    }
    throw new WrongProductRouteError();
  }

  if (input.sectionId) {
    const section = await prisma.providerSection.findUnique({
      where: { id: input.sectionId },
    });
    if (!section) throw new CatalogNotFoundError("Sección no encontrada");
    if (section.providerId !== provider.id) throw new CatalogForbiddenError();
  }

  const existing = await prisma.providerProduct.findUnique({
    where: {
      providerId_productId: { providerId: provider.id, productId: input.productId },
    },
  });

  let result;
  if (existing) {
    const nextPrice = input.price !== undefined ? input.price : existing.price;
    assertPublishablePrice(nextPrice, input.isAvailable);
    result = await prisma.providerProduct.update({
      where: { id: existing.id },
      data: {
        isAvailable: input.isAvailable,
        ...(input.price !== undefined ? { price: input.price } : {}),
        ...(input.sectionId !== undefined ? { sectionId: input.sectionId } : {}),
      },
      include: { product: true },
    });
  } else if (input.price !== undefined) {
    assertPublishablePrice(input.price, input.isAvailable);
    result = await prisma.providerProduct.create({
      data: {
        providerId: provider.id,
        productId: input.productId,
        price: input.price,
        isAvailable: input.isAvailable,
        ...(input.sectionId ? { sectionId: input.sectionId } : {}),
      },
      include: { product: true },
    });
  } else {
    throw new ProductActivationError(
      "Debes especificar un precio para activar un producto nuevo"
    );
  }

  await writeAuditLog({
    module: SystemModule.PRODUCTS,
    action: input.isAvailable ? AuditAction.ENABLE : AuditAction.DISABLE,
    entityId: result.id,
    userId,
    ipAddress,
    details: { productId: input.productId, price: input.price },
  });

  return {
    id: result.id,
    providerId: result.providerId,
    productId: result.productId,
    price: Number(result.price),
    isAvailable: result.isAvailable,
    product: {
      id: result.product.id,
      name: result.product.name,
      category: result.product.category,
      unit: result.product.unit,
    },
  };
}

export class ProductActivationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductActivationError";
  }
}

async function assertAccessibleProduct(providerId: string, productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new CatalogForbiddenError();
  if (product.scope === ProductScope.LOCAL && product.ownerProviderId !== providerId) {
    throw new CatalogForbiddenError();
  }
  return product;
}

export async function archiveProviderOffer(params: {
  userId: string;
  providerId: string;
  productId: string;
  ipAddress?: string;
}) {
  const provider = await findOwnedProvider(params.userId, params.providerId);
  if (!provider) throw new ProviderNotFoundError("Perfil de proveedor no encontrado");
  const product = await assertAccessibleProduct(provider.id, params.productId);

  const existing = await prisma.providerProduct.findUnique({
    where: { providerId_productId: { providerId: provider.id, productId: product.id } },
  });

  if (existing?.archivedAt) {
    return {
      productId: product.id,
      providerProductId: existing.id,
      archivedAt: existing.archivedAt.toISOString(),
      createdStub: false,
    };
  }

  const now = new Date();
  const result = await prisma.$transaction(async (tx) => {
    if (existing) {
      const updated = await tx.providerProduct.update({
        where: { id: existing.id },
        data: { archivedAt: now },
      });
      return { row: updated, createdStub: false };
    }
    const created = await tx.providerProduct.create({
      data: {
        providerId: provider.id,
        productId: product.id,
        price: 0,
        isAvailable: false,
        saleUnit: null,
        archivedAt: now,
        onHand: 0,
      },
    });
    await insertPriceHistory(tx, {
      providerProductId: created.id,
      price: 0,
      previousPrice: null,
      changedByUserId: params.userId,
    });
    return { row: created, createdStub: true };
  });

  await writeAuditLog({
    module: SystemModule.PRODUCTS,
    action: AuditAction.DISABLE,
    entityId: result.row.id,
    userId: params.userId,
    ipAddress: params.ipAddress,
    details: { archived: true, productId: product.id },
  });

  return {
    productId: product.id,
    providerProductId: result.row.id,
    archivedAt: (result.row.archivedAt ?? now).toISOString(),
    createdStub: result.createdStub,
  };
}

export async function restoreProviderOffer(params: {
  userId: string;
  providerId: string;
  productId: string;
  ipAddress?: string;
}) {
  const provider = await findOwnedProvider(params.userId, params.providerId);
  if (!provider) throw new ProviderNotFoundError("Perfil de proveedor no encontrado");
  await assertAccessibleProduct(provider.id, params.productId);

  const existing = await prisma.providerProduct.findUnique({
    where: {
      providerId_productId: { providerId: provider.id, productId: params.productId },
    },
  });
  if (!existing) throw new RestoreOfferNotFoundError();

  const updated = await prisma.providerProduct.update({
    where: { id: existing.id },
    data: { archivedAt: null },
  });

  await writeAuditLog({
    module: SystemModule.PRODUCTS,
    action: AuditAction.ENABLE,
    entityId: updated.id,
    userId: params.userId,
    ipAddress: params.ipAddress,
    details: { archived: false, productId: params.productId },
  });

  return {
    productId: params.productId,
    providerProductId: updated.id,
    archivedAt: null,
  };
}

export async function patchOfferByProduct(params: {
  userId: string;
  providerId: string;
  productId: string;
  input: {
    price?: string | number;
    saleUnit?: ProductUnit | null;
    boxContentFactor?: string | number | null;
    sectionId?: string | null;
    isAvailable?: boolean;
    confirmDiscard?: boolean;
  };
  ipAddress?: string;
}) {
  const provider = await findOwnedProvider(params.userId, params.providerId);
  if (!provider) throw new ProviderNotFoundError("Perfil de proveedor no encontrado");
  const product = await assertAccessibleProduct(provider.id, params.productId);

  if (params.input.sectionId) {
    const section = await prisma.providerSection.findUnique({
      where: { id: params.input.sectionId },
    });
    if (!section) throw new CatalogNotFoundError("Sección no encontrada");
    if (section.providerId !== provider.id) throw new CatalogForbiddenError();
  }

  const existing = await prisma.providerProduct.findUnique({
    where: { providerId_productId: { providerId: provider.id, productId: product.id } },
  });

  if (!existing && params.input.price === undefined) {
    throw new ProductActivationError("Debes especificar un precio para activar un producto nuevo");
  }

  const nextAvailable =
    params.input.isAvailable !== undefined
      ? params.input.isAvailable
      : existing?.isAvailable ?? true;
  const nextPrice =
    params.input.price !== undefined ? toDecimal(params.input.price) : existing?.price;
  assertPublishablePrice(nextPrice, nextAvailable);

  const nextSaleUnit =
    params.input.saleUnit !== undefined ? params.input.saleUnit : existing?.saleUnit ?? null;
  const nextFactor =
    params.input.boxContentFactor !== undefined
      ? params.input.boxContentFactor === null
        ? null
        : toDecimal(params.input.boxContentFactor)
      : existing?.boxContentFactor ?? null;
  const nextUnit = nextSaleUnit ?? product.unit;
  assertCajaFactor(nextUnit, nextFactor);

  const unitOrFactorChanged = Boolean(
    existing &&
      ((params.input.saleUnit !== undefined && params.input.saleUnit !== existing.saleUnit) ||
        (params.input.boxContentFactor !== undefined &&
          String(params.input.boxContentFactor ?? "") !== String(existing.boxContentFactor ?? "")))
  );

  const reserved = existing
    ? (await sumReservedByProductIds(provider.id, [existing.id])).get(existing.id) ??
      new Prisma.Decimal(0)
    : new Prisma.Decimal(0);
  const { discardOnHand } = existing
    ? assertUnitFactorChangeAllowed({
        reserved,
        onHand: existing.onHand,
        unitOrFactorChanged,
        confirmDiscard: params.input.confirmDiscard,
      })
    : { discardOnHand: false };

  const created = !existing;
  const row = await prisma.$transaction(async (tx) => {
    if (!existing) {
      const createdRow = await tx.providerProduct.create({
        data: {
          providerId: provider.id,
          productId: product.id,
          price: toDecimal(params.input.price!),
          isAvailable: params.input.isAvailable ?? true,
          saleUnit: nextSaleUnit,
          boxContentFactor: nextFactor,
          sectionId: params.input.sectionId ?? undefined,
        },
        include: { product: true, section: true },
      });
      await insertPriceHistory(tx, {
        providerProductId: createdRow.id,
        price: createdRow.price,
        previousPrice: null,
        changedByUserId: params.userId,
      });
      return createdRow;
    }

    const priceChanged =
      params.input.price !== undefined &&
      !toDecimal(params.input.price).eq(existing.price);

    const updated = await tx.providerProduct.update({
      where: { id: existing.id },
      data: {
        ...(params.input.price !== undefined ? { price: toDecimal(params.input.price) } : {}),
        ...(params.input.saleUnit !== undefined ? { saleUnit: params.input.saleUnit } : {}),
        ...(params.input.boxContentFactor !== undefined ? { boxContentFactor: nextFactor } : {}),
        ...(params.input.sectionId !== undefined ? { sectionId: params.input.sectionId } : {}),
        ...(params.input.isAvailable !== undefined ? { isAvailable: params.input.isAvailable } : {}),
        ...(discardOnHand ? { onHand: 0 } : {}),
      },
      include: { product: true, section: true },
    });
    if (priceChanged) {
      await insertPriceHistory(tx, {
        providerProductId: updated.id,
        price: updated.price,
        previousPrice: existing.price,
        changedByUserId: params.userId,
      });
    }
    return updated;
  });

  await writeAuditLog({
    module: SystemModule.PRODUCTS,
    action: AuditAction.UPDATE,
    entityId: row.id,
    userId: params.userId,
    ipAddress: params.ipAddress,
    details: { productId: product.id },
  });

  const reservedAfter =
    (await sumReservedByProductIds(provider.id, [row.id])).get(row.id) ?? new Prisma.Decimal(0);
  const bar = catalogBarFields(row, reservedAfter);
  return {
    created,
    row: {
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        category: product.category,
        unit: product.unit,
        description: product.description,
        imageUrl: row.imageUrl ?? product.imageUrl,
      },
      price: Number(row.price),
      isAvailable: row.isAvailable,
      providerProductId: row.id,
      scope: product.scope,
      sectionId: row.sectionId,
      sectionName: row.section?.name ?? null,
      imageUrl: row.imageUrl ?? product.imageUrl,
      ...offerPanelFields({
        archivedAt: row.archivedAt,
        saleUnit: row.saleUnit,
        boxContentFactor: row.boxContentFactor,
        product,
        providerId: provider.id,
      }),
      ...(bar ?? {}),
    },
  };
}

export async function patchOfferPrice(params: {
  userId: string;
  providerId: string;
  productId: string;
  price: string | number;
}) {
  const provider = await findOwnedProvider(params.userId, params.providerId);
  if (!provider) throw new ProviderNotFoundError("Perfil de proveedor no encontrado");
  const product = await assertAccessibleProduct(provider.id, params.productId);
  const existing = await prisma.providerProduct.findUnique({
    where: { providerId_productId: { providerId: provider.id, productId: product.id } },
  });
  const next = toDecimal(params.price);
  if (existing && next.eq(existing.price)) {
    return {
      productId: product.id,
      providerProductId: existing.id,
      price: formatOfferPrice(existing.price),
      previousPrice: formatOfferPrice(existing.price),
    };
  }
  const patched = await patchOfferByProduct({
    userId: params.userId,
    providerId: params.providerId,
    productId: params.productId,
    input: { price: params.price },
  });
  return {
    productId: product.id,
    providerProductId: patched.row.providerProductId,
    price: formatOfferPrice(patched.row.price),
    previousPrice: existing ? formatOfferPrice(existing.price) : null,
  };
}

export async function listOfferPriceHistory(params: {
  userId: string;
  providerId: string;
  providerProductId: string;
  page: number;
  limit: number;
  skip: number;
}) {
  const provider = await findOwnedProvider(params.userId, params.providerId);
  if (!provider) throw new ProviderNotFoundError("Perfil de proveedor no encontrado");
  const row = await prisma.providerProduct.findUnique({
    where: { id: params.providerProductId },
  });
  if (!row || row.providerId !== provider.id) throw new CatalogForbiddenError();

  const where = { providerProductId: row.id };
  const [total, rows] = await Promise.all([
    prisma.providerProductPriceHistory.count({ where }),
    prisma.providerProductPriceHistory.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: params.skip,
      take: params.limit,
    }),
  ]);
  return {
    data: rows.map((item) => ({
      id: item.id,
      price: formatOfferPrice(item.price),
      previousPrice: item.previousPrice ? formatOfferPrice(item.previousPrice) : null,
      changedByUserId: item.changedByUserId,
      createdAt: item.createdAt.toISOString(),
    })),
    meta: buildMeta(params.page, params.limit, total),
  };
}
