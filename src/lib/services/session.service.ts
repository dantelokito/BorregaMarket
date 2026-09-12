import type { JwtPayload } from "@/lib/auth/token";
import { pickActiveProvider, sessionBrandFromProvider } from "@/lib/auth/active-provider";
import { listOwnedProviders } from "@/lib/providers/owned-provider";

export type AuthSessionProviderRow = {
  id: string;
  businessName: string;
  primaryColor: string | null;
  secondaryColor: string | null;
};

export type AuthSessionPayload = {
  authenticated: boolean;
  role: "CLIENT" | "PROVIDER" | "ADMIN" | null;
  brand: {
    primaryColor: string;
    secondaryColor: string;
    source: "provider";
  } | null;
  providerCount: number;
  activeProviderId: string | null;
  providers: AuthSessionProviderRow[];
};

export type SessionResolution = {
  payload: AuthSessionPayload;
  cookieProviderId: string | null;
  cookieCorrected: boolean;
};

export async function getAuthSessionPayload(
  session: JwtPayload | null,
  cookieProviderId?: string | null
): Promise<AuthSessionPayload> {
  const resolved = await resolveAuthSession(session, cookieProviderId);
  return resolved.payload;
}

export async function resolveAuthSession(
  session: JwtPayload | null,
  cookieProviderId?: string | null
): Promise<SessionResolution> {
  if (!session) {
    return {
      payload: {
        authenticated: false,
        role: null,
        brand: null,
        providerCount: 0,
        activeProviderId: null,
        providers: [],
      },
      cookieProviderId: null,
      cookieCorrected: false,
    };
  }

  if (session.role !== "PROVIDER") {
    return {
      payload: {
        authenticated: true,
        role: session.role,
        brand: null,
        providerCount: 0,
        activeProviderId: null,
        providers: [],
      },
      cookieProviderId: null,
      cookieCorrected: false,
    };
  }

  const providers = await listOwnedProviders(session.sub);
  if (providers.length === 0) {
    return {
      payload: {
        authenticated: true,
        role: "PROVIDER",
        brand: null,
        providerCount: 0,
        activeProviderId: null,
        providers: [],
      },
      cookieProviderId: null,
      cookieCorrected: Boolean(cookieProviderId),
    };
  }

  const { provider, cookieCorrected } = pickActiveProvider(providers, cookieProviderId ?? null);

  return {
    payload: {
      authenticated: true,
      role: "PROVIDER",
      brand: sessionBrandFromProvider(provider),
      providerCount: providers.length,
      activeProviderId: provider.id,
      providers: providers.map((p) => ({
        id: p.id,
        businessName: p.businessName,
        primaryColor: p.primaryColor,
        secondaryColor: p.secondaryColor,
      })),
    },
    cookieProviderId: provider.id,
    cookieCorrected,
  };
}
