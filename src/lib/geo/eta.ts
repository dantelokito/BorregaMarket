/** Velocidad urbana estimada Monterrey (ADR-017). */
export const AVG_SPEED_KMH = 25;

export type EtaCopyKey = "eta_prep_only" | "eta_ready_approx";

export interface EtaResult {
  preparationTimeMinutes: number;
  travelMinutes: number;
  etaMinutes: number;
  distanceKm: number;
  copyKey: EtaCopyKey;
}

export function computeEtaMinutes(params: {
  preparationTimeMinutes: number;
  distanceKm: number;
}): EtaResult {
  const preparationTimeMinutes = params.preparationTimeMinutes;
  const distanceKm = Math.max(0, params.distanceKm);
  const travelMinutes =
    distanceKm > 0 ? Math.max(1, Math.round((distanceKm / AVG_SPEED_KMH) * 60)) : 0;

  return {
    preparationTimeMinutes,
    travelMinutes,
    etaMinutes: preparationTimeMinutes + travelMinutes,
    distanceKm,
    copyKey: travelMinutes === 0 ? "eta_prep_only" : "eta_ready_approx",
  };
}
