import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UserRole, SystemModule, AuditAction } from "@prisma/client";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { signToken, TOKEN_COOKIE } from "@/lib/auth/token";
import { writeAuditLog } from "@/lib/audit";

const registerSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Contraseña mínima 8 caracteres"),
  name: z.string().min(2, "Nombre requerido"),
  phone: z.string().optional(),
  role: z.enum([UserRole.CLIENT, UserRole.PROVIDER]).default(UserRole.CLIENT),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = registerSchema.parse(body);

    const exists = await prisma.user.findUnique({ where: { email: data.email } });
    if (exists) {
      return NextResponse.json({ error: "El email ya está registrado" }, { status: 409 });
    }

    const passwordHash = await hashPassword(data.password);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
        phone: data.phone,
        role: data.role,
      },
    });

    await writeAuditLog({
      module: SystemModule.USERS,
      action: AuditAction.CREATE,
      entityId: user.id,
      userId: user.id,
      details: { email: user.email, role: user.role },
    });

    const token = signToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    const response = NextResponse.json(
      {
        token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      },
      { status: 201 }
    );

    response.cookies.set(TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
