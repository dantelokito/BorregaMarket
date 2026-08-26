import { NextRequest } from "next/server";
import { z } from "zod";
import { UserRole, SystemModule, AuditAction } from "@prisma/client";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { signToken } from "@/lib/auth/token";
import { setSessionCookie } from "@/lib/auth/cookie";
import { writeAuditLog } from "@/lib/audit";
import { ok, apiError, fromZodError } from "@/lib/api/response";
import {
  AuthRateLimitError,
  AuthRedisUnavailableError,
  checkAuthRateLimit,
  clientIp,
} from "@/lib/rate-limit/auth";

const registerSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Contraseña mínima 8 caracteres"),
  name: z.string().min(2, "Nombre requerido"),
  phone: z.string().optional(),
  role: z.enum([UserRole.CLIENT, UserRole.PROVIDER]).default(UserRole.CLIENT),
});

export async function POST(request: NextRequest) {
  try {
    const allowed = await checkAuthRateLimit({ action: "register", ip: clientIp(request) });
    if (!allowed) {
      throw new AuthRateLimitError();
    }

    const body = await request.json();
    const data = registerSchema.parse(body);

    const exists = await prisma.user.findUnique({ where: { email: data.email } });
    if (exists) {
      return apiError("El email ya está registrado", 409);
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

    const response = ok(
      { user: { id: user.id, email: user.email, name: user.name, role: user.role } },
      201
    );

    setSessionCookie(response, token);

    return response;
  } catch (err) {
    if (err instanceof AuthRateLimitError) {
      return apiError(err.message, 429);
    }
    if (err instanceof AuthRedisUnavailableError) {
      return apiError(err.message, 503);
    }
    if (err instanceof z.ZodError) {
      const details = fromZodError(err);
      return apiError("Validation failed", 400, details);
    }
    return apiError("Error interno", 500);
  }
}
