import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SystemModule, AuditAction } from "@prisma/client";
import prisma from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { signToken, TOKEN_COOKIE } from "@/lib/auth/token";
import { writeAuditLog } from "@/lib/audit";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Contraseña mínima 6 caracteres"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    const token = signToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    await writeAuditLog({
      module: SystemModule.AUTH,
      action: AuditAction.LOGIN,
      entityId: user.id,
      userId: user.id,
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
      details: { email: user.email, role: user.role },
    });

    const response = NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });

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
