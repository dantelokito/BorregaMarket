import { SystemModule, AuditAction } from "@prisma/client";
import prisma from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { ProviderNotFoundError } from "@/lib/services/provider.service";

export interface UpsertProviderProductInput {
  productId: string;
  isAvailable: boolean;
  price?: number;
}

export async function getProviderCatalog(userId: string) {
  const provider = await prisma.provider.findUnique({ where: { userId } });
  if (!provider) {
    throw new ProviderNotFoundError("Perfil de proveedor no encontrado");
  }

  const allProducts = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  const providerProducts = await prisma.providerProduct.findMany({
    where: { providerId: provider.id },
  });

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
      },
      price: pp ? Number(pp.price) : null,
      isAvailable: pp?.isAvailable ?? false,
      providerProductId: pp?.id ?? null,
    };
  });

  return {
    provider: {
      id: provider.id,
      businessName: provider.businessName,
    },
    catalog,
  };
}

export async function upsertProviderProduct(
  userId: string,
  input: UpsertProviderProductInput,
  ipAddress?: string
) {
  const provider = await prisma.provider.findUnique({ where: { userId } });
  if (!provider) {
    throw new ProviderNotFoundError("Perfil de proveedor no encontrado");
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
