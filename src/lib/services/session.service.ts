import type { JwtPayload } from "@/lib/auth/token";
import prisma from "@/lib/prisma";
import { canonicalizeHex, isBrandPairValid } from "@/lib/color/contrast";

export type AuthSessionPayload = {
  authenticated: boolean;
  role: "CLIENT" | "PROVIDER" | "ADMIN" | null;
  brand: {
    primaryColor: string;
    secondaryColor: string;
    source: "provider";
  } | null;
};

export async function getAuthSessionPayload(
  session: JwtPayload | null
): Promise<AuthSessionPayload> {
  if (!session) {
    return { authenticated: false, role: null, brand: null };
  }

  if (session.role !== "PROVIDER") {
    return { authenticated: true, role: session.role, brand: null };
  }

  const provider = await prisma.provider.findUnique({
    where: { userId: session.sub },
    select: { primaryColor: true, secondaryColor: true },
  });

  if (!provider || !isBrandPairValid(provider.primaryColor, provider.secondaryColor)) {
    return { authenticated: true, role: "PROVIDER", brand: null };
  }

  return {
    authenticated: true,
    role: "PROVIDER",
    brand: {
      primaryColor: canonicalizeHex(provider.primaryColor!)!,
      secondaryColor: canonicalizeHex(provider.secondaryColor!)!,
      source: "provider",
    },
  };
}
