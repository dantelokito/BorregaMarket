import { formatRadius } from "@/lib/maps/format-radius";

interface ExploreCountProps {
  /** meta.total from GET /api/providers — never data.length (US-GEO-13). */
  total: number;
  /** meta.radiusKm applied by the server; falls back to the slider value. */
  radiusKm: number | null;
  suffix?: string;
}

export function ExploreCount({ total, radiusKm, suffix }: ExploreCountProps) {
  const noun = total === 1 ? "frutería" : "fruterías";
  const text =
    radiusKm != null ? `${total} ${noun} a ${formatRadius(radiusKm)}` : `${total} ${noun} en Monterrey`;

  return (
    <p className="text-sm text-slate-700" aria-live="polite">
      {text}
      {suffix}
    </p>
  );
}
