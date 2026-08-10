import { Prisma, SystemModule, AuditAction } from "@prisma/client";
import prisma from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { buildMeta } from "@/lib/services/pagination";
import {
  createProviderSchema,
  type CreateProviderInput,
} from "@/lib/validators/provider";

export class ProviderConflictError extends Error {
  constructor(message = "Ya tienes un negocio registrado") {
    super(message);
    this.name = "ProviderConflictError";
  }
}

export class ProviderNotFoundError extends Error {
  constructor(message = "Frutería no encontrada") {
    super(message);
    this.name = "ProviderNotFoundError";
  }
}

interface ListProvidersFilters {
  city?: string | null;
  q?: string | null;
  verified?: boolean;
  category?: "FRUTA" | "VERDURA" | "AGRICOLA" | null;
}

interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

function mapProviderCard(p: {
  id: string;
  businessName: string;
  description: string | null;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  phone: string;
  logoUrl: string | null;
  coverUrl: string | null;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  providerProducts: Array<{
    price: Prisma.Decimal;
    product: { name: string; unit: string; imageUrl: string | null };
  }>;
  _count: { providerProducts: number };
}) {
  const prices = p.providerProducts.map((pp) => Number(pp.price));
  return {
    id: p.id,
    businessName: p.businessName,
    description: p.description,
    address: p.address,
    city: p.city,
    latitude: p.latitude,
    longitude: p.longitude,
    phone: p.phone,
    logoUrl: p.logoUrl,
    coverUrl: p.coverUrl,
    rating: p.rating,
    reviewCount: p.reviewCount,
    isVerified: p.isVerified,
    productCount: p._count.providerProducts,
    minPrice: prices.length ? Math.min(...prices) : null,
    sampleProducts: p.providerProducts.map((pp) => ({
      name: pp.product.name,
      price: Number(pp.price),
      unit: pp.product.unit,
      imageUrl: pp.product.imageUrl,
    })),
  };
}

function buildWhere(filters: ListProvidersFilters): Prisma.ProviderWhereInput {
  const and: Prisma.ProviderWhereInput[] = [];

  if (filters.category) {
    and.push({
      providerProducts: {
        some: {
          isAvailable: true,
          product: {
            isActive: true,
            category: filters.category,
          },
        },
      },
    });
  }

  if (filters.q) {
    and.push({
      OR: [
        { businessName: { contains: filters.q, mode: "insensitive" as const } },
        { description: { contains: filters.q, mode: "insensitive" as const } },
        {
          providerProducts: {
            some: {
              isAvailable: true,
              product: {
                isActive: true,
                name: { contains: filters.q, mode: "insensitive" as const },
              },
            },
          },
        },
      ],
    });
  }

  return {
    isActive: true,
    ...(filters.city
      ? { city: { contains: filters.city, mode: "insensitive" as const } }
      : {}),
    ...(filters.verified ? { isVerified: true } : {}),
    ...(and.length > 0 ? { AND: and } : {}),
  };
}

export async function getProviderByUserId(userId: string) {
  return prisma.provider.findUnique({ where: { userId } });
}

export async function createProvider(
  userId: string,
  data: CreateProviderInput,
  ipAddress?: string
) {
  const existing = await prisma.provider.findUnique({ where: { userId } });
  if (existing) {
    throw new ProviderConflictError();
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ProviderNotFoundError("Usuario no encontrado");
  }

  const phone = data.phone ?? user.phone ?? "";

  const provider = await prisma.provider.create({
    data: {
      userId,
      businessName: data.businessName,
      address: data.address,
      city: data.city,
      latitude: data.latitude,
      longitude: data.longitude,
      phone,
      description: data.description,
    },
  });

  await writeAuditLog({
    module: SystemModule.PROVIDERS,
    action: AuditAction.CREATE,
    entityId: provider.id,
    userId,
    ipAddress,
    details: { businessName: provider.businessName },
  });

  return provider;
}

export async function listProviders(
  filters: ListProvidersFilters,
  pagination: PaginationParams
) {
  const where = buildWhere(filters);

  const [providers, total] = await Promise.all([
    prisma.provider.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      include: {
        providerProducts: {
          where: { isAvailable: true },
          include: { product: true },
          take: 5,
        },
        _count: { select: { providerProducts: { where: { isAvailable: true } } } },
      },
      orderBy: { rating: "desc" },
    }),
    prisma.provider.count({ where }),
  ]);

  return {
    data: providers.map(mapProviderCard),
    meta: buildMeta(pagination.page, pagination.limit, total),
  };
}

export async function getProviderDetail(id: string) {
  const provider = await prisma.provider.findFirst({
    where: { id, isActive: true },
    include: {
      providerProducts: {
        where: { isAvailable: true, product: { isActive: true } },
        include: { product: true },
        orderBy: [{ product: { category: "asc" } }, { product: { name: "asc" } }],
      },
    },
  });

  if (!provider) {
    throw new ProviderNotFoundError();
  }

  return {
    id: provider.id,
    businessName: provider.businessName,
    description: provider.description,
    address: provider.address,
    city: provider.city,
    state: provider.state,
    latitude: provider.latitude,
    longitude: provider.longitude,
    phone: provider.phone,
    logoUrl: provider.logoUrl,
    coverUrl: provider.coverUrl,
    rating: provider.rating,
    reviewCount: provider.reviewCount,
    isVerified: provider.isVerified,
    products: provider.providerProducts.map((pp) => ({
      productId: pp.product.id,
      name: pp.product.name,
      slug: pp.product.slug,
      category: pp.product.category,
      unit: pp.product.unit,
      price: Number(pp.price),
      isAvailable: pp.isAvailable,
      imageUrl: pp.product.imageUrl,
    })),
  };
}

export async function listAdminProviders(
  filters: { verified?: boolean },
  pagination: PaginationParams
) {
  const where: Prisma.ProviderWhereInput = {
    ...(filters.verified !== undefined ? { isVerified: filters.verified } : {}),
  };

  const [providers, total] = await Promise.all([
    prisma.provider.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      include: { user: { select: { email: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.provider.count({ where }),
  ]);

  return {
    data: providers.map((p) => ({
      id: p.id,
      businessName: p.businessName,
      city: p.city,
      phone: p.phone,
      isVerified: p.isVerified,
      isActive: p.isActive,
      userEmail: p.user.email,
      createdAt: p.createdAt.toISOString(),
    })),
    meta: buildMeta(pagination.page, pagination.limit, total),
  };
}

export async function updateProviderVerification(
  id: string,
  isVerified: boolean,
  adminUserId: string,
  ipAddress?: string
) {
  const provider = await prisma.provider.findUnique({ where: { id } });
  if (!provider) {
    throw new ProviderNotFoundError("Proveedor no encontrado");
  }

  const updated = await prisma.provider.update({
    where: { id },
    data: { isVerified },
    select: { id: true, businessName: true, isVerified: true },
  });

  await writeAuditLog({
    module: SystemModule.PROVIDERS,
    action: AuditAction.UPDATE,
    entityId: id,
    userId: adminUserId,
    ipAddress,
    details: { isVerified },
  });

  return updated;
}

export { createProviderSchema };
