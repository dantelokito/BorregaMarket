import { NextRequest } from "next/server";
import { z } from "zod";
import { SystemModule, AuditAction } from "@prisma/client";
import prisma from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { signToken } from "@/lib/auth/token";
import { setSessionCookie, setActiveProviderCookie } from "@/lib/auth/cookie";
import { listOwnedProviders } from "@/lib/providers/owned-provider";
import { writeAuditLog } from "@/lib/audit";
import { ok, apiError, fromZodError } from "@/lib/api/response";
import {
  AuthRateLimitError,
  AuthRedisUnavailableError,
  checkAuthRateLimit,
  clientIp,
} from "@/lib/rate-limit/auth";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Contraseña mínima 8 caracteres"),
});

export async function POST(request: NextRequest) {
  try {
    const allowed = await checkAuthRateLimit({ action: "login", ip: clientIp(request) });
    if (!allowed) {
      throw new AuthRateLimitError();
    }

    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return apiError("Credenciales inválidas", 401);
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return apiError("Credenciales inválidas", 401);
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

    const response = ok({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });

    setSessionCookie(response, token);
    if (user.role === "PROVIDER") {
      const first = (await listOwnedProviders(user.id))[0];
      if (first) {
        setActiveProviderCookie(response, first.id);
      }
    }

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
      return apiError(details[0]?.message ?? "Validation failed", 400, details);
    }
    return apiError("Error interno", 500);
  }
}
