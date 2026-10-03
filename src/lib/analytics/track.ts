import { measurementAllowsScript } from "./measurement";

export const ANALYTICS_EVENTS = [
  "explore_search",
  "provider_view",
  "contact_click",
  "cart_add",
  "register_success",
  "login_success",
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

/** Props cerradas: sin correo, teléfono, nombre, userId, texto de búsqueda ni coordenadas. */
export type AnalyticsProps = {
  providerId?: string;
  category?: string;
  source?: string;
};

type UmamiTrack = (event: string, props?: Record<string, string>) => void;

function umamiTrack(): UmamiTrack | null {
  if (typeof window === "undefined") return null;
  const umami = (window as Window & { umami?: { track?: UmamiTrack } }).umami;
  return typeof umami?.track === "function" ? umami.track : null;
}

export function track(event: AnalyticsEvent, props?: AnalyticsProps): void {
  try {
    if (!measurementAllowsScript()) return;
    const send = umamiTrack();
    if (!send) return;
    const safe: Record<string, string> = {};
    if (props?.providerId) safe.providerId = props.providerId;
    if (props?.category) safe.category = props.category;
    if (props?.source) safe.source = props.source;
    send(event, Object.keys(safe).length > 0 ? safe : undefined);
  } catch {
    /* Umami caído o bloqueado no afecta la app */
  }
}
