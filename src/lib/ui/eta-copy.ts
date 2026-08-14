import type { EtaCopyKey } from "@/lib/api/types";

export function etaChipLabel(copyKey: EtaCopyKey, minutes: number): string {
  if (copyKey === "eta_prep_only") {
    return `Tiempo de preparación: ~${minutes} min`;
  }
  return `Listo aprox. en ~${minutes} min`;
}

export const ETA_DISCLAIMER = "Es una estimación, no una hora exacta";
