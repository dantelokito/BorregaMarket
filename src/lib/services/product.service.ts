import { AuditAction, Prisma, ProductScope, SystemModule } from "@prisma/client";
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

export interface UpsertProviderProductInput {
  productId: string;
  isAvailable: boolean;
  price?: number;
  sectionId?: string;
}

export async function getProviderCatalog(userId: string, providerId?: string) {
  const provider = await findOwnedProvider(userId, providerId);
  if (!provider) {
    throw new ProviderNotFoundError("Perfil de proveedor no encontrado");
  }

  const [allProducts, providerProducts] = await Promise.all([
    prisma.product.findMany({
      where: {
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

  const catalog = allProducts.map((product) => {
    const pp = ppMap.get(product.id);
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
    };
  });

  catalog.sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.product.name.localeCompare(b.product.name, "es");
  });

  const instanceIds = providerProducts.map((pp) => pp.id);
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
