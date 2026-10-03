export const MEASUREMENT_KEY = "lbm_measurement";
export const UMAMI_DISABLED_KEY = "umami.disabled";
export const MEASUREMENT_EVENT = "lbm-measurement-change";

export type MeasurementValue = "on" | "off" | "absent";

let memoryOverride: "on" | "off" | null = null;

export function readMeasurement(): { value: MeasurementValue; persistent: boolean } {
  if (memoryOverride) return { value: memoryOverride, persistent: false };
  if (typeof window === "undefined") return { value: "absent", persistent: true };
  try {
    const raw = window.localStorage.getItem(MEASUREMENT_KEY);
    if (raw === "on" || raw === "off") return { value: raw, persistent: true };
    return { value: "absent", persistent: true };
  } catch {
    return { value: "absent", persistent: false };
  }
}

export function writeMeasurement(value: "on" | "off"): { persisted: boolean } {
  memoryOverride = value;
  if (typeof window === "undefined") return { persisted: false };
  try {
    window.localStorage.setItem(MEASUREMENT_KEY, value);
    if (value === "off") window.localStorage.setItem(UMAMI_DISABLED_KEY, "1");
    else window.localStorage.removeItem(UMAMI_DISABLED_KEY);
    window.dispatchEvent(new Event(MEASUREMENT_EVENT));
    return { persisted: true };
  } catch {
    window.dispatchEvent(new Event(MEASUREMENT_EVENT));
    return { persisted: false };
  }
}

export function privacySignal(): "dnt" | "gpc" | null {
  if (typeof navigator === "undefined") return null;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  const dnt =
    nav.doNotTrack === "1" ||
    (typeof window !== "undefined" &&
      (window as Window & { doNotTrack?: string }).doNotTrack === "1");
  if (dnt) return "dnt";
  if (nav.globalPrivacyControl === true) return "gpc";
  return null;
}

/** Medición activa salvo opt-out, DNT o GPC. Ausente cuenta como activa. */
export function measurementAllowsScript(): boolean {
  if (privacySignal()) return false;
  return readMeasurement().value !== "off";
}
