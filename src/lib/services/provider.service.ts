import { Prisma, SystemModule, AuditAction, ProductUnit } from "@prisma/client";
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
import { formatAuthorName } from "@/lib/validators/review";
import { effectiveSaleUnit, sellableProviderProductWhere } from "@/lib/catalog/sellable";
import {
  computeIsOpenNow,
  isHoursPublished,
  normalizeOpeningHours,
} from "@/lib/providers/opening-hours";
import { findOwnedProvider } from "@/lib/providers/owned-provider";
import { CatalogForbiddenError } from "@/lib/services/local-product.service";

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
  offersWholesale?: boolean;
  offersDelivery?: boolean;
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
    offersWholesale: boolean;
    offersDelivery: boolean;
    providerProducts: Array<{
      price: Prisma.Decimal;
      saleUnit: ProductUnit | null;
      product: { name: string; unit: ProductUnit; imageUrl: string | null };
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
    offersWholesale: p.offersWholesale,
    offersDelivery: p.offersDelivery,
    productCount: p._count.providerProducts,
    minPrice: prices.length ? Math.min(...prices) : null,
    sampleProducts: p.providerProducts.map((pp) => ({
      name: pp.product.name,
      price: Number(pp.price),
      unit: effectiveSaleUnit(pp.saleUnit, pp.product.unit),
      imageUrl: pp.product.imageUrl,
    })),
    ...(distanceKm !== undefined ? { distanceKm } : {}),
  };
}

export function buildWhere(filters: ListProvidersFilters): Prisma.ProviderWhereInput {
  const and: Prisma.ProviderWhereInput[] = [];

  if (filters.category) {
    and.push({
      providerProducts: {
        some: {
          ...sellableProviderProductWhere,
          product: {
            isActive: true,
            scope: "GLOBAL",
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
              ...sellableProviderProductWhere,
              product: {
                isActive: true,
                OR: [
                  { name: { contains: filters.q, mode: "insensitive" as const } },
                  { slug: { contains: filters.q, mode: "insensitive" as const } },
                ],
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
    ...(filters.offersWholesale === true ? { offersWholesale: true } : {}),
    ...(filters.offersDelivery === true ? { offersDelivery: true } : {}),
    ...(and.length > 0 ? { AND: and } : {}),
  };
}

export async function getProviderByUserId(userId: string, providerId?: string | null) {
  return findOwnedProvider(userId, providerId);
}

export async function createProvider(
  userId: string,
  data: CreateProviderInput,
  ipAddress?: string
) {
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

/** Canales públicos: vendible = isAvailable + Product.isActive + no archivado (ADR-022 / ADR-038). */
export { sellableProviderProductWhere };

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
        include: { product: true, section: true },
      },
      reviews: {
        include: { client: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 3,
      },
    },
  });

  if (!provider) {
    throw new ProviderNotFoundError();
  }

  const openingHours = normalizeOpeningHours(provider.openingHours);
  const hoursPublished = isHoursPublished(openingHours);

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
    verifiedAt: provider.verifiedAt?.toISOString() ?? null,
    preparationTimeMinutes: provider.preparationTimeMinutes,
    offersDelivery: provider.offersDelivery,
    whatsappEnabled: provider.whatsappEnabled,
    acceptsCardAtStore: provider.acceptsCardAtStore,
    offersWholesale: provider.offersWholesale,
    offersRetail: provider.offersRetail,
    hoursPublished,
    isOpenNow: computeIsOpenNow(openingHours),
    openingHours,
    googleReviews: googleReviewsGate(provider),
    reviewsPreview: (provider.reviews ?? []).map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      authorName: formatAuthorName(review.client.name),
      createdAt: review.createdAt.toISOString(),
    })),
    products: [...provider.providerProducts]
      .sort((a, b) => {
        const ao = a.section?.sortOrder ?? Number.MAX_SAFE_INTEGER;
        const bo = b.section?.sortOrder ?? Number.MAX_SAFE_INTEGER;
        if (ao !== bo) return ao - bo;
        return a.product.name.localeCompare(b.product.name, "es");
      })
      .map((pp) => ({
      providerProductId: pp.id,
      productId: pp.product.id,
      name: pp.product.name,
      slug: pp.product.slug,
      category: pp.product.category,
      unit: effectiveSaleUnit(pp.saleUnit, pp.product.unit),
      unitOfMeasure: toUnitOfMeasure(effectiveSaleUnit(pp.saleUnit, pp.product.unit)),
      price: Number(pp.price),
      isAvailable: pp.isAvailable,
      imageUrl: pp.imageUrl ?? pp.product.imageUrl,
      scope: pp.product.scope,
      sectionId: pp.sectionId,
      sectionName: pp.section?.name ?? null,
      sectionSortOrder: pp.section?.sortOrder ?? null,
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
        offersWholesale: p.offersWholesale,
        offersDelivery: p.offersDelivery,
        userId: p.userId,
        ownerEmail: userEmail,
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
      ...(params.input.isVerified === true
        ? {
            isVerified: true,
            verifiedAt: provider.verifiedAt ?? new Date(),
          }
        : {}),
      ...(params.input.isVerified === false
        ? { isVerified: false, verifiedAt: null, googleReviewsEnabled: false }
        : {}),
      ...(params.input.isActive !== undefined ? { isActive: params.input.isActive } : {}),
      ...(params.input.offersWholesale !== undefined
        ? { offersWholesale: params.input.offersWholesale }
        : {}),
      ...(params.input.offersDelivery !== undefined
        ? { offersDelivery: params.input.offersDelivery }
        : {}),
      ...brandData,
    },
    select: {
      id: true,
      businessName: true,
      isVerified: true,
      isActive: true,
      offersWholesale: true,
      offersDelivery: true,
      googleReviewsEnabled: true,
      verifiedAt: true,
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
      ...(params.input.isActive !== undefined ? { isActive: params.input.isActive } : {}),
      ...(params.input.offersWholesale !== undefined
        ? { offersWholesale: params.input.offersWholesale }
        : {}),
      ...(params.input.offersDelivery !== undefined
        ? { offersDelivery: params.input.offersDelivery }
        : {}),
      googleReviewsEnabled: updated.googleReviewsEnabled,
      ...(bodyTouchesBrand(params.input)
        ? {
            primaryColor: updated.primaryColor,
            secondaryColor: updated.secondaryColor,
          }
        : {}),
    },
  });

  return {
    id: updated.id,
    businessName: updated.businessName,
    isVerified: updated.isVerified,
    isActive: updated.isActive,
    offersWholesale: updated.offersWholesale,
    offersDelivery: updated.offersDelivery,
    googleReviewsEnabled: updated.googleReviewsEnabled,
    verifiedAt: updated.verifiedAt?.toISOString() ?? null,
  };
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
  verifiedAt?: Date | null;
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
  whatsappEnabled?: boolean;
  acceptsCardAtStore?: boolean;
  offersWholesale?: boolean;
  offersRetail?: boolean;
  posShowImages?: boolean;
  openingHours?: Prisma.JsonValue | null;
}) {
  const openingHours = normalizeOpeningHours(provider.openingHours);
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
    verifiedAt: provider.verifiedAt?.toISOString() ?? null,
    isActive: provider.isActive,
    logoUrl: provider.logoUrl,
    coverUrl: provider.coverUrl,
    preparationTimeMinutes: provider.preparationTimeMinutes,
    offersDelivery: provider.offersDelivery,
    whatsappEnabled: provider.whatsappEnabled ?? false,
    acceptsCardAtStore: provider.acceptsCardAtStore ?? false,
    offersWholesale: provider.offersWholesale ?? false,
    offersRetail: provider.offersRetail ?? true,
    posShowImages: provider.posShowImages ?? true,
    openingHours,
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
  providerId?: string;
  input: PatchProviderSettingsInput;
  ipAddress?: string;
}) {
  const provider = await findOwnedProvider(params.userId, params.providerId);
  if (!provider) {
    throw new ProviderNotFoundError("Perfil de proveedor no encontrado");
  }

  if (
    (params.input.providerId && params.input.providerId !== provider.id) ||
    (params.input.id && params.input.id !== provider.id)
  ) {
    throw new CatalogForbiddenError();
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
      ...(params.input.whatsappEnabled !== undefined
        ? { whatsappEnabled: params.input.whatsappEnabled }
        : {}),
      ...(params.input.acceptsCardAtStore !== undefined
        ? { acceptsCardAtStore: params.input.acceptsCardAtStore }
        : {}),
      ...(params.input.offersWholesale !== undefined
        ? { offersWholesale: params.input.offersWholesale }
        : {}),
      ...(params.input.offersRetail !== undefined
        ? { offersRetail: params.input.offersRetail }
        : {}),
      ...(params.input.posShowImages !== undefined
        ? { posShowImages: params.input.posShowImages }
        : {}),
      ...(params.input.openingHours !== undefined
        ? {
            openingHours:
              params.input.openingHours === null
                ? Prisma.DbNull
                : params.input.openingHours,
          }
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
