export type { ProviderListing, AuthUser } from "@/lib/api/types";

export const FILTER_CHIPS = [
  { id: "organico", label: "Orgánico", icon: "🌿", disabled: true },
  { id: "mayoreo", label: "Mayoreo", icon: "📦", disabled: true },
  { id: "domicilio", label: "A domicilio", icon: "🚚", disabled: true },
  { id: "verificado", label: "Verificado", icon: "✓", disabled: false },
  { id: "frutas", label: "Frutas", icon: "🍎", disabled: false },
  { id: "verduras", label: "Verduras", icon: "🥬", disabled: false },
  { id: "agricola", label: "Agrícola", icon: "🌾", disabled: false },
  { id: "filtros", label: "Filtros", icon: "⚙️", disabled: true },
] as const;

/** Chip id → API category enum (API-PROVIDERS-01) */
export const CHIP_TO_CATEGORY: Record<string, "FRUTA" | "VERDURA" | "AGRICOLA"> = {
  frutas: "FRUTA",
  verduras: "VERDURA",
  agricola: "AGRICOLA",
};
