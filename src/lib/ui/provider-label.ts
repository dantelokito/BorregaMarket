/** Colonia aproximada desde dirección seed (último o penúltimo segmento). */
export function colonyFromAddress(address: string | null | undefined): string {
  if (!address?.trim()) return "";
  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) return parts[parts.length - 2];
  return parts[0] ?? "";
}

export function shouldShowProviderSwitcher(providerCount: number): boolean {
  return providerCount > 1;
}

export function shouldShowGlobalReports(providerCount: number): boolean {
  return providerCount > 1;
}

/** Mapea `GET /api/auth/session` F11 a filas del switcher (sin mock). */
export function mineProvidersFromSession(session: {
  providers?: { id: string; businessName: string }[] | null;
}): MineProviderLite[] {
  return (session.providers ?? []).map((p) => ({
    id: p.id,
    businessName: p.businessName,
    address: "",
    isActive: true,
  }));
}

export interface MineProviderLite {
  id: string;
  businessName: string;
  address: string;
  isActive: boolean;
}

export function shouldRetryScopeSession(session: {
  authenticated: boolean;
  role: string | null;
}): boolean {
  return !session.authenticated && session.role !== "PROVIDER";
}
