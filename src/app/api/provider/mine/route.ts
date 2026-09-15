import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { getSession, requireRole, AuthError } from "@/lib/auth/session";
import {
  applyActiveProviderCookie,
  pickActiveProvider,
  readActiveProviderCookie,
} from "@/lib/auth/active-provider";
import { ok, apiError, handleRouteError } from "@/lib/api/response";
import { listOwnedProviders } from "@/lib/providers/owned-provider";

/** Lista canónica de sucursales del PROVIDER (switcher). */
export async function GET(request: NextRequest) {
  try {
    const session = requireRole(getSession(request), UserRole.PROVIDER);
    const providers = await listOwnedProviders(session.sub);
    if (providers.length === 0) {
      const response = ok({
        providerCount: 0,
        activeProviderId: null,
        providers: [],
      });
      return response;
    }
    const { provider } = pickActiveProvider(providers, readActiveProviderCookie(request));
    const response = ok({
      providerCount: providers.length,
      activeProviderId: provider.id,
      providers: providers.map((p) => ({
        id: p.id,
        businessName: p.businessName,
        address: p.address,
        isActive: p.isActive,
      })),
    });
    return applyActiveProviderCookie(response, provider.id);
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError(err.message, err.status);
    }
    return handleRouteError(err);
  }
}
