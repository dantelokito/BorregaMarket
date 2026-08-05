import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UserRole, SystemModule, AuditAction } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getSession, requireRole, AuthError } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit";

const toggleSchema = z.object({
  productId: z.string(),
  isAvailable: z.boolean(),
  price: z.number().positive().optional(),
});

/** Proveedor: activar/inactivar productos del catálogo global */
export async function GET(request: NextRequest) {
  try {
    const session = requireRole(getSession(request), UserRole.PROVIDER);

    const provider = await prisma.provider.findUnique({ where: { userId: session.sub } });
    if (!provider) {
      return NextResponse.json({ error: "Perfil de proveedor no encontrado" }, { status: 404 });
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
        product,
        price: pp ? Number(pp.price) : null,
        isAvailable: pp?.isAvailable ?? false,
        providerProductId: pp?.id ?? null,
      };
    });

    return NextResponse.json({ provider, catalog });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = requireRole(getSession(request), UserRole.PROVIDER);
    const body = toggleSchema.parse(await request.json());

    const provider = await prisma.provider.findUnique({ where: { userId: session.sub } });
    if (!provider) {
      return NextResponse.json({ error: "Perfil de proveedor no encontrado" }, { status: 404 });
    }

    const existing = await prisma.providerProduct.findUnique({
      where: {
        providerId_productId: { providerId: provider.id, productId: body.productId },
      },
    });

    let result;
    if (existing) {
      result = await prisma.providerProduct.update({
        where: { id: existing.id },
        data: {
          isAvailable: body.isAvailable,
          ...(body.price !== undefined ? { price: body.price } : {}),
        },
        include: { product: true },
      });
    } else if (body.price !== undefined) {
      result = await prisma.providerProduct.create({
        data: {
          providerId: provider.id,
          productId: body.productId,
          price: body.price,
          isAvailable: body.isAvailable,
        },
        include: { product: true },
      });
    } else {
      return NextResponse.json(
        { error: "Debes especificar un precio para activar un producto nuevo" },
        { status: 400 }
      );
    }

    await writeAuditLog({
      module: SystemModule.PRODUCTS,
      action: body.isAvailable ? AuditAction.ENABLE : AuditAction.DISABLE,
      entityId: result.id,
      userId: session.sub,
      details: { productId: body.productId, price: body.price },
    });

    return NextResponse.json({ providerProduct: result });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
