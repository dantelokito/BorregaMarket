import { Prisma, SystemModule, AuditAction } from "@prisma/client";
import prisma from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { buildMeta } from "@/lib/services/pagination";
import { toUnitOfMeasure } from "@/lib/orders/labels";
import { haversineKm, roundDistanceKm } from "@/lib/geo/haversine";
import { computeEtaMinutes } from "@/lib/geo/eta";
import { googleReviewsGate } from "@/lib/validation/google-maps";
import {
  createProviderSchema,
  type CreateProviderInput,
} from "@/lib/validators/provider";
import {
  bodyTouchesBrand,
  bodyTouchesGoogle,
  type PatchAdminProviderInput,
  type PatchProviderSettingsInput,
} from "@/lib/validators/provider-settings";
import { canonicalizeHex } from "@/lib/color/contrast";

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

export class GoogleReviewsLockedError extends Error {
  constructor(message = "Requiere verificación de tu negocio") {
    super(message);
    this.name = "GoogleReviewsLockedError";
  }
}

export class ProviderSettingsValidationError extends Error {
  constructor(
    message: string,
    public details: { field: string; message: string }[]
  ) {
    super(message);
    this.name = "ProviderSettingsValidationError";
  }
}

interface ListProvidersFilters {
  city?: string | null;
  q?: string | null;
  verified?: boolean;
  category?: "FRUTA" | "VERDURA" | "AGRICOLA" | null;
  geo?: { lat: number; lng: number; radiusKm: number } | null;
}

interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

function mapProviderCard(
  p: {
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
  },
  distanceKm?: number
) {
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
    ...(distanceKm !== undefined ? { distanceKm } : {}),
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

/** Canales públicos: vendible = isAvailable + Product.isActive (ADR-022). */
export const sellableProviderProductWhere = {
  isAvailable: true,
  product: { isActive: true },
} as const;

const providerCardInclude = {
  providerProducts: {
    where: sellableProviderProductWhere,
    include: { product: true },
    take: 5,
  },
  _count: { select: { providerProducts: { where: sellableProviderProductWhere } } },
} as const;

export async function listProviders(
  filters: ListProvidersFilters,
  pagination: PaginationParams
) {
  const where = buildWhere(filters);

  if (!filters.geo) {
    const [providers, total] = await Promise.all([
      prisma.provider.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        include: providerCardInclude,
        orderBy: { rating: "desc" },
      }),
      prisma.provider.count({ where }),
    ]);

    return {
      data: providers.map((p) => mapProviderCard(p)),
      meta: buildMeta(pagination.page, pagination.limit, total),
    };
  }

  const candidates = await prisma.provider.findMany({
    where,
    include: providerCardInclude,
  });

  const withDistance = candidates
    .map((p) => ({
      provider: p,
      distanceKm: roundDistanceKm(
        haversineKm(filters.geo!.lat, filters.geo!.lng, p.latitude, p.longitude)
      ),
    }))
    .filter((row) => row.distanceKm <= filters.geo!.radiusKm)
    .sort((a, b) => {
      if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
      return b.provider.rating - a.provider.rating;
    });

  const total = withDistance.length;
  const pageRows = withDistance.slice(
    pagination.skip,
    pagination.skip + pagination.limit
  );

  return {
    data: pageRows.map((row) => mapProviderCard(row.provider, row.distanceKm)),
    meta: {
      ...buildMeta(pagination.page, pagination.limit, total),
      radiusKm: filters.geo.radiusKm,
    },
  };
}

export async function getProviderDetail(id: string) {
  const provider = await prisma.provider.findFirst({
    where: { id, isActive: true },
    include: {
      providerProducts: {
        where: sellableProviderProductWhere,
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
    preparationTimeMinutes: provider.preparationTimeMinutes,
    offersDelivery: provider.offersDelivery,
    googleReviews: googleReviewsGate(provider),
    products: provider.providerProducts.map((pp) => ({
      providerProductId: pp.id,
      productId: pp.product.id,
      name: pp.product.name,
      slug: pp.product.slug,
      category: pp.product.category,
      unit: pp.product.unit,
      unitOfMeasure: toUnitOfMeasure(pp.product.unit),
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
    data: providers.map((p) => {
      const userEmail = p.user.email?.trim() ?? "";
      const hasValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail);
      return {
        id: p.id,
        businessName: p.businessName,
        city: p.city,
        phone: p.phone,
        isVerified: p.isVerified,
        isActive: p.isActive,
        userEmail,
        /** US-NOTIFY-04: badge admin cuando el negocio no puede recibir email */
        hasValidEmail,
        createdAt: p.createdAt.toISOString(),
      };
    }),
    meta: buildMeta(pagination.page, pagination.limit, total),
  };
}

export async function updateAdminProvider(params: {
  id: string;
  adminUserId: string;
  input: PatchAdminProviderInput;
  ipAddress?: string;
}) {
  const provider = await prisma.provider.findUnique({ where: { id: params.id } });
  if (!provider) {
    throw new ProviderNotFoundError("Proveedor no encontrado");
  }

  const brandData = bodyTouchesBrand(params.input)
    ? {
        primaryColor:
          params.input.primaryColor === null
            ? null
            : canonicalizeHex(params.input.primaryColor as string),
        secondaryColor:
          params.input.secondaryColor === null
            ? null
            : canonicalizeHex(params.input.secondaryColor as string),
      }
    : {};

  const updated = await prisma.provider.update({
    where: { id: params.id },
    data: {
      ...(params.input.isVerified !== undefined ? { isVerified: params.input.isVerified } : {}),
      ...(params.input.isVerified === false ? { googleReviewsEnabled: false } : {}),
      ...brandData,
    },
    select: {
      id: true,
      businessName: true,
      isVerified: true,
      googleReviewsEnabled: true,
      primaryColor: true,
      secondaryColor: true,
    },
  });

  await writeAuditLog({
    module: SystemModule.PROVIDERS,
    action: AuditAction.UPDATE,
    entityId: params.id,
    userId: params.adminUserId,
    ipAddress: params.ipAddress,
    details: {
      ...(params.input.isVerified !== undefined ? { isVerified: params.input.isVerified } : {}),
      googleReviewsEnabled: updated.googleReviewsEnabled,
      ...(bodyTouchesBrand(params.input)
        ? {
            primaryColor: updated.primaryColor,
            secondaryColor: updated.secondaryColor,
          }
        : {}),
    },
  });

  return updated;
}

export async function updateProviderVerification(
  id: string,
  isVerified: boolean,
  adminUserId: string,
  ipAddress?: string
) {
  return updateAdminProvider({
    id,
    adminUserId,
    ipAddress,
    input: { isVerified },
  });
}

function serializeProviderSettings(provider: {
  id: string;
  businessName: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  phone: string;
  description: string | null;
  isVerified: boolean;
  isActive: boolean;
  logoUrl: string | null;
  coverUrl: string | null;
  preparationTimeMinutes: number;
  offersDelivery: boolean;
  googlePlaceId: string | null;
  googleMapsUrl: string | null;
  googleReviewsEnabled: boolean;
  primaryColor?: string | null;
  secondaryColor?: string | null;
}) {
  return {
    id: provider.id,
    businessName: provider.businessName,
    address: provider.address,
    city: provider.city,
    latitude: provider.latitude,
    longitude: provider.longitude,
    phone: provider.phone,
    description: provider.description,
    isVerified: provider.isVerified,
    isActive: provider.isActive,
    logoUrl: provider.logoUrl,
    coverUrl: provider.coverUrl,
    preparationTimeMinutes: provider.preparationTimeMinutes,
    offersDelivery: provider.offersDelivery,
    googlePlaceId: provider.googlePlaceId,
    googleMapsUrl: provider.googleMapsUrl,
    googleReviewsEnabled: provider.googleReviewsEnabled,
    googleReviewsLocked: !provider.isVerified,
    primaryColor: provider.primaryColor ?? null,
    secondaryColor: provider.secondaryColor ?? null,
  };
}

export function toProviderSettings(provider: Parameters<typeof serializeProviderSettings>[0]) {
  return serializeProviderSettings(provider);
}

export async function updateProviderSettings(params: {
  userId: string;
  input: PatchProviderSettingsInput;
  ipAddress?: string;
}) {
  const provider = await prisma.provider.findUnique({ where: { userId: params.userId } });
  if (!provider) {
    throw new ProviderNotFoundError("Perfil de proveedor no encontrado");
  }

  if (bodyTouchesGoogle(params.input) && !provider.isVerified) {
    throw new GoogleReviewsLockedError();
  }

  const nextPlaceId =
    params.input.googlePlaceId !== undefined
      ? params.input.googlePlaceId
      : provider.googlePlaceId;
  const nextMapsUrl =
    params.input.googleMapsUrl !== undefined
      ? params.input.googleMapsUrl
      : provider.googleMapsUrl;
  const nextEnabled =
    params.input.googleReviewsEnabled !== undefined
      ? params.input.googleReviewsEnabled
      : provider.googleReviewsEnabled;

  if (nextEnabled && !nextPlaceId && !nextMapsUrl) {
    throw new ProviderSettingsValidationError("Validation failed", [
      {
        field: "googleReviewsEnabled",
        message: "Indica Place ID o URL de Google Maps",
      },
    ]);
  }

  const brandData = bodyTouchesBrand(params.input)
    ? {
        primaryColor:
          params.input.primaryColor === null
            ? null
            : canonicalizeHex(params.input.primaryColor as string),
        secondaryColor:
          params.input.secondaryColor === null
            ? null
            : canonicalizeHex(params.input.secondaryColor as string),
      }
    : {};

  const updated = await prisma.provider.update({
    where: { id: provider.id },
    data: {
      ...(params.input.preparationTimeMinutes !== undefined
        ? { preparationTimeMinutes: params.input.preparationTimeMinutes }
        : {}),
      ...(params.input.offersDelivery !== undefined
        ? { offersDelivery: params.input.offersDelivery }
        : {}),
      ...(params.input.googlePlaceId !== undefined
        ? { googlePlaceId: params.input.googlePlaceId }
        : {}),
      ...(params.input.googleMapsUrl !== undefined
        ? { googleMapsUrl: params.input.googleMapsUrl }
        : {}),
      ...(params.input.googleReviewsEnabled !== undefined
        ? { googleReviewsEnabled: params.input.googleReviewsEnabled }
        : {}),
      ...brandData,
    },
  });

  await writeAuditLog({
    module: SystemModule.PROVIDERS,
    action: AuditAction.UPDATE,
    entityId: provider.id,
    userId: params.userId,
    ipAddress: params.ipAddress,
    details: {
      preparationTimeMinutes: updated.preparationTimeMinutes,
      offersDelivery: updated.offersDelivery,
      googleReviewsEnabled: updated.googleReviewsEnabled,
      ...(bodyTouchesBrand(params.input)
        ? {
            primaryColor: updated.primaryColor,
            secondaryColor: updated.secondaryColor,
          }
        : {}),
    },
  });

  return serializeProviderSettings(updated);
}

export async function getProviderEta(params: {
  providerId: string;
  lat: number | null;
  lng: number | null;
  fulfillmentType: "PICKUP" | "DELIVERY";
}) {
  const provider = await prisma.provider.findFirst({
    where: { id: params.providerId, isActive: true },
  });
  if (!provider) {
    throw new ProviderNotFoundError();
  }

  if (params.fulfillmentType === "DELIVERY" && !provider.offersDelivery) {
    throw new ProviderSettingsValidationError("Validation failed", [
      {
        field: "fulfillmentType",
        message: "Este negocio no ofrece entrega a domicilio",
      },
    ]);
  }

  const distanceKm =
    params.lat !== null && params.lng !== null
      ? haversineKm(params.lat, params.lng, provider.latitude, provider.longitude)
      : 0;
  const eta = computeEtaMinutes({
    preparationTimeMinutes: provider.preparationTimeMinutes,
    distanceKm,
  });

  return {
    providerId: provider.id,
    preparationTimeMinutes: eta.preparationTimeMinutes,
    travelMinutes: eta.travelMinutes,
    etaMinutes: eta.etaMinutes,
    distanceKm: roundDistanceKm(eta.distanceKm),
    fulfillmentType: params.fulfillmentType,
    copyKey: eta.copyKey,
  };
}

export { createProviderSchema };
