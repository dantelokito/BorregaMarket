import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { getSession, requireRole, AuthError } from "@/lib/auth/session";
import { ok, apiError } from "@/lib/api/response";
import { getProviderByUserId } from "@/lib/services/provider.service";

/** Proveedor: obtener perfil del negocio autenticado */
export async function GET(request: NextRequest) {
  try {
    const session = requireRole(getSession(request), UserRole.PROVIDER);
    const provider = await getProviderByUserId(session.sub);

    if (!provider) {
      return apiError("Perfil de proveedor no encontrado", 404);
    }

    return ok({
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
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError(err.message, err.status);
    }
    return apiError("Error interno", 500);
  }
}
