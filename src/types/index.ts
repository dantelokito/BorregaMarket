export type { ProviderListing, AuthUser } from "@/lib/api/types";

export const FILTER_CHIPS = [
  { id: "mayoreo", label: "Mayoreo", icon: "📦" },
  { id: "domicilio", label: "A domicilio", icon: "🚚" },
  { id: "verificado", label: "Verificado", icon: "✓" },
  { id: "frutas", label: "Frutas", icon: "🍎" },
  { id: "verduras", label: "Verduras", icon: "🥬" },
  { id: "agricola", label: "Agrícola", icon: "🌾" },
] as const;

/** Chip id → API category enum (API-PROVIDERS-01) */
export const CHIP_TO_CATEGORY: Record<string, "FRUTA" | "VERDURA" | "AGRICOLA"> = {
  frutas: "FRUTA",
  verduras: "VERDURA",
  agricola: "AGRICOLA",
};
