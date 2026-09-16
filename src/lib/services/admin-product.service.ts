import { AuditAction, ProductScope, Prisma, SystemModule } from "@prisma/client";
import prisma from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { slugify } from "@/lib/validation/plain-text";
import { assertRateLimit } from "@/lib/rate-limit/token-bucket";
import { buildMeta, parseStrictPagination } from "@/lib/services/pagination";
import type {
  CreateAdminProductInput,
  PatchAdminProductInput,
} from "@/lib/validators/catalog-f10";

export class AdminQueryError extends Error {
  constructor(
    message: string,
    public details: { field: string; message: string }[]
  ) {
    super(message);
    this.name = "AdminQueryError";
  }
}

export class ProductConflictError extends Error {
  constructor(message = "El slug ya existe en el catálogo global") {
    super(message);
    this.name = "ProductConflictError";
  }
}

export class ProductNotFoundError extends Error {
  constructor(message = "Producto no encontrado") {
    super(message);
    this.name = "ProductNotFoundError";
  }
}

export class ProductDeleteForbiddenError extends Error {
  constructor(
    message = "No se puede eliminar: el producto tiene ofertas o ventas"
  ) {
    super(message);
    this.name = "ProductDeleteForbiddenError";
  }

  details() {
    return [{ field: "id", message: "Retira el producto con isActive=false" }];
  }
}

function serializeProduct(product: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  unit: string;
  imageUrl: string | null;
  isActive: boolean;
  scope: ProductScope;
  ownerProviderId: string | null;
  createdAt: Date;
  ownerProvider?: { businessName: string } | null;
}) {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    category: product.category,
    unit: product.unit,
    imageUrl: product.imageUrl,
    isActive: product.isActive,
    scope: product.scope,
    ownerProviderId: product.ownerProviderId,
    ownerBusinessName: product.ownerProvider?.businessName ?? null,
    createdAt: product.createdAt.toISOString(),
  };
}

export async function listAdminProducts(params: {
  searchParams: URLSearchParams;
  q?: string;
  isActive?: boolean;
  scope?: ProductScope;
  ownerProviderId?: string;
}) {
  const { page, limit, skip } = parseStrictPagination(params.searchParams, {
    defaultLimit: 50,
    maxLimit: 100,
  });

  if (params.scope === ProductScope.GLOBAL && params.ownerProviderId) {
    throw new AdminQueryError("Datos inválidos", [
      { field: "ownerProviderId", message: "ownerProviderId no aplica a scope=GLOBAL" },
    ]);
  }

  if (params.ownerProviderId) {
    const owner = await prisma.provider.findUnique({
      where: { id: params.ownerProviderId },
      select: { id: true },
    });
    if (!owner) {
      return { data: [], meta: buildMeta(page, limit, 0) };
    }
  }

  const where: Prisma.ProductWhereInput = {
    ...(params.scope ? { scope: params.scope } : {}),
    ...(params.q
      ? {
          OR: [
            { name: { contains: params.q, mode: "insensitive" } },
            { slug: { contains: params.q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(params.isActive !== undefined ? { isActive: params.isActive } : {}),
    ...(params.ownerProviderId ? { ownerProviderId: params.ownerProviderId, scope: ProductScope.LOCAL } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { ownerProvider: { select: { businessName: true } } },
      orderBy: { name: "asc" },
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    data: rows.map(serializeProduct),
    meta: buildMeta(page, limit, total),
  };
}

async function assertGlobalSlugFree(slug: string, excludeId?: string) {
  const existing = await prisma.product.findFirst({
    where: {
      slug,
      scope: ProductScope.GLOBAL,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
  if (existing) throw new ProductConflictError();
}

export async function createAdminProduct(params: {
  input: CreateAdminProductInput;
  adminUserId: string;
  ipAddress?: string;
}) {
  assertRateLimit(`admin-product-create:${params.adminUserId}`, 60, 60 * 60 * 1000);

  const slug = params.input.slug?.trim() || slugify(params.input.name);
  await assertGlobalSlugFree(slug);

  const created = await prisma.product.create({
    data: {
      name: params.input.name,
      slug,
      description: params.input.description ?? null,
      category: params.input.category,
      unit: params.input.unit,
      isActive: params.input.isActive ?? true,
      scope: ProductScope.GLOBAL,
      ownerProviderId: null,
    },
    include: { ownerProvider: { select: { businessName: true } } },
  });

  await writeAuditLog({
    module: SystemModule.PRODUCTS,
    action: AuditAction.CREATE,
    entityId: created.id,
    userId: params.adminUserId,
    ipAddress: params.ipAddress,
    details: { name: created.name, slug: created.slug, scope: "GLOBAL" },
  });

  return serializeProduct(created);
}

export async function updateAdminProduct(params: {
  id: string;
  input: PatchAdminProductInput;
  adminUserId: string;
  ipAddress?: string;
}) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: { ownerProvider: { select: { businessName: true } } },
  });
  if (!product) {
    throw new ProductNotFoundError();
  }

  if (product.scope === ProductScope.LOCAL) {
    const extra = Object.keys(params.input).filter((key) => key !== "isActive");
    if (extra.length > 0 || params.input.isActive === undefined) {
      throw new AdminQueryError("Datos inválidos", [
        { field: "body", message: "LOCAL solo admite isActive" },
      ]);
    }
  }

  if (product.scope === ProductScope.GLOBAL && params.input.slug && params.input.slug !== product.slug) {
    await assertGlobalSlugFree(params.input.slug, product.id);
  }

  const updated = await prisma.product.update({
    where: { id: product.id },
    data:
      product.scope === ProductScope.LOCAL
        ? { isActive: params.input.isActive }
        : {
            ...(params.input.name !== undefined ? { name: params.input.name } : {}),
            ...(params.input.slug !== undefined ? { slug: params.input.slug } : {}),
            ...(params.input.description !== undefined
              ? { description: params.input.description }
              : {}),
            ...(params.input.category !== undefined ? { category: params.input.category } : {}),
            ...(params.input.unit !== undefined ? { unit: params.input.unit } : {}),
            ...(params.input.isActive !== undefined ? { isActive: params.input.isActive } : {}),
          },
    include: { ownerProvider: { select: { businessName: true } } },
  });

  const action =
    params.input.isActive === false
      ? AuditAction.DISABLE
      : params.input.isActive === true
        ? AuditAction.ENABLE
        : AuditAction.UPDATE;

  await writeAuditLog({
    module: SystemModule.PRODUCTS,
    action,
    entityId: updated.id,
    userId: params.adminUserId,
    ipAddress: params.ipAddress,
    details: {
      ...params.input,
      ...(product.scope === ProductScope.LOCAL ? { scope: "LOCAL" } : {}),
    },
  });

  return serializeProduct(updated);
}

export async function assertProductHardDeleteAllowed(productId: string) {
  const [ppCount, itemCount] = await Promise.all([
    prisma.providerProduct.count({ where: { productId } }),
    prisma.orderItem.count({ where: { productId } }),
  ]);
  if (ppCount > 0 || itemCount > 0) {
    throw new ProductDeleteForbiddenError();
  }
}
