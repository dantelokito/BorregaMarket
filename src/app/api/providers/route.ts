import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/** API pública: listar fruterías para la vista tipo Airbnb */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city");
  const q = searchParams.get("q");

  const providers = await prisma.provider.findMany({
    where: {
      isActive: true,
      ...(city ? { city: { contains: city, mode: "insensitive" } } : {}),
      ...(q
        ? {
            OR: [
              { businessName: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      providerProducts: {
        where: { isAvailable: true },
        include: { product: true },
        take: 5,
      },
      _count: { select: { providerProducts: { where: { isAvailable: true } } } },
    },
    orderBy: { rating: "desc" },
  });

  const mapped = providers.map((p) => ({
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
    sampleProducts: p.providerProducts.map((pp) => ({
      name: pp.product.name,
      price: Number(pp.price),
      unit: pp.product.unit,
    })),
    minPrice: p.providerProducts.length
      ? Math.min(...p.providerProducts.map((pp) => Number(pp.price)))
      : null,
  }));

  return NextResponse.json({ providers: mapped, total: mapped.length });
}
