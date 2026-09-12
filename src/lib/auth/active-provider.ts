import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { ACTIVE_PROVIDER_COOKIE } from "@/lib/auth/types";
import { getSession, requireRole, AuthError, type JwtPayload } from "@/lib/auth/session";
import { setActiveProviderCookie } from "@/lib/auth/cookie";
import { listOwnedProviders } from "@/lib/providers/owned-provider";
import { ProviderNotFoundError } from "@/lib/services/provider.service";
import { canonicalizeHex, isBrandPairValid } from "@/lib/color/contrast";

export { ACTIVE_PROVIDER_COOKIE };

export type ActiveProviderContext = {
  session: JwtPayload;
  provider: Awaited<ReturnType<typeof listOwnedProviders>>[number];
  providers: Awaited<ReturnType<typeof listOwnedProviders>>;
  cookieCorrected: boolean;
};

export function readActiveProviderCookie(request: NextRequest): string | null {
  return request.cookies.get(ACTIVE_PROVIDER_COOKIE)?.value ?? null;
}

export function pickActiveProvider<T extends { id: string }>(
  providers: T[],
  cookieId: string | null
): { provider: T; cookieCorrected: boolean } {
  const match = cookieId ? providers.find((p) => p.id === cookieId) : undefined;
  return {
    provider: match ?? providers[0],
    cookieCorrected: !match,
  };
}

export async function requireActiveProvider(request: NextRequest): Promise<ActiveProviderContext> {
  const session = requireRole(getSession(request), UserRole.PROVIDER);
  const providers = await listOwnedProviders(session.sub);
  if (providers.length === 0) {
    throw new ProviderNotFoundError("Perfil de proveedor no encontrado");
  }
  const { provider, cookieCorrected } = pickActiveProvider(
    providers,
    readActiveProviderCookie(request)
  );
  return { session, provider, providers, cookieCorrected };
}

export function applyActiveProviderCookie<T extends NextResponse>(
  response: T,
  providerId: string
): T {
  setActiveProviderCookie(response, providerId);
  return response;
}

export function sessionBrandFromProvider(provider: {
  primaryColor: string | null;
  secondaryColor: string | null;
}) {
  if (!isBrandPairValid(provider.primaryColor, provider.secondaryColor)) {
    return null;
  }
  return {
    primaryColor: canonicalizeHex(provider.primaryColor!)!,
    secondaryColor: canonicalizeHex(provider.secondaryColor!)!,
    source: "provider" as const,
  };
}

export class ActiveProviderForbiddenError extends AuthError {
  constructor(message = "Acceso denegado") {
    super(message, 403);
    this.name = "ActiveProviderForbiddenError";
  }
}
