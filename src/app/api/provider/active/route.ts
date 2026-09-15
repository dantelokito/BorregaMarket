import { NextRequest } from "next/server";
import { UserRole, SystemModule, AuditAction } from "@prisma/client";
import { z } from "zod";
import { getSession, requireRole, AuthError } from "@/lib/auth/session";
import { applyActiveProviderCookie, sessionBrandFromProvider } from "@/lib/auth/active-provider";
import { ok, apiError, fromZodError, handleRouteError } from "@/lib/api/response";
import { findOwnedProvider } from "@/lib/providers/owned-provider";
import { writeAuditLog } from "@/lib/audit";

const bodySchema = z
  .object({
    providerId: z.string().cuid("providerId inválido"),
  })
  .strict();

/** Fija sucursal activa (cookie lbm_active_provider). Ignora X-Active-Provider-Id. */
export async function POST(request: NextRequest) {
  try {
    const session = requireRole(getSession(request), UserRole.PROVIDER);
    const body = bodySchema.parse(await request.json());
    const provider = await findOwnedProvider(session.sub, body.providerId);
    if (!provider) {
      return apiError("Acceso denegado", 403);
    }

    await writeAuditLog({
      module: SystemModule.PROVIDERS,
      action: AuditAction.UPDATE,
      entityId: provider.id,
      userId: session.sub,
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
      details: { activeProvider: true },
    });

    const response = ok({
      activeProviderId: provider.id,
      businessName: provider.businessName,
      brand: sessionBrandFromProvider(provider),
    });
    return applyActiveProviderCookie(response, provider.id);
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError(err.message, err.status);
    }
    if (err instanceof z.ZodError) {
      return apiError("Validation failed", 400, fromZodError(err));
    }
    if (err instanceof SyntaxError) {
      return apiError("Validation failed", 400, [
        { field: "body", message: "JSON inválido" },
      ]);
    }
    return handleRouteError(err);
  }
}
