import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getSession, requireRole, AuthError } from "@/lib/auth/session";
import { hasModulePermission } from "@/lib/auth/permissions";
import { SystemModule } from "@prisma/client";

/** Catálogos del sistema — SOLO ADMIN */
export async function GET(request: NextRequest) {
  try {
    const session = requireRole(getSession(request), UserRole.ADMIN);
    const { searchParams } = new URL(request.url);
    const catalog = searchParams.get("catalog");

    const canView = await hasModulePermission(session.role, SystemModule.USERS, "view");
    if (!canView) {
      return NextResponse.json({ error: "Sin permiso para ver catálogos" }, { status: 403 });
    }

    switch (catalog) {
      case "users":
        return NextResponse.json({
          data: await prisma.user.findMany({
            select: {
              id: true,
              email: true,
              name: true,
              phone: true,
              role: true,
              isActive: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
          }),
        });

      case "providers":
        return NextResponse.json({
          data: await prisma.provider.findMany({
            include: { user: { select: { email: true, name: true } } },
            orderBy: { createdAt: "desc" },
          }),
        });

      case "products":
        return NextResponse.json({
          data: await prisma.product.findMany({ orderBy: { name: "asc" } }),
        });

      case "orders":
        return NextResponse.json({
          data: await prisma.order.findMany({
            include: {
              client: { select: { name: true, email: true } },
              provider: { select: { businessName: true } },
              items: { include: { product: { select: { name: true } } } },
            },
            orderBy: { createdAt: "desc" },
          }),
        });

      case "permissions":
        return NextResponse.json({
          data: await prisma.rolePermission.findMany({
            include: { module: true },
            orderBy: [{ role: "asc" }, { module: { name: "asc" } }],
          }),
        });

      case "audit":
        return NextResponse.json({
          data: await prisma.auditLog.findMany({
            include: { user: { select: { name: true, email: true } } },
            orderBy: { createdAt: "desc" },
            take: 100,
          }),
        });

      case "modules":
        return NextResponse.json({
          data: await prisma.module.findMany({ orderBy: { name: "asc" } }),
        });

      default:
        return NextResponse.json(
          {
            catalogs: [
              "users",
              "providers",
              "products",
              "orders",
              "permissions",
              "audit",
              "modules",
            ],
          },
          { status: 200 }
        );
    }
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
