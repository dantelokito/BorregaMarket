/**
 * Copy de radio para UI (US-GEO-20 / US-GEO-22). El param API sigue en km decimal.
 * No redondear los km del clamp: solo formatea la etiqueta.
 */
export function formatRadius(km: number): string {
  if (!Number.isFinite(km)) return "";
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  const oneDecimal = Math.round(km * 10) / 10;
  if (Number.isInteger(oneDecimal)) return `${oneDecimal} km`;
  return `${oneDecimal} km`;
}
