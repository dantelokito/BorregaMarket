import { z } from "zod";
import {
  MEXICO_BOUNDS,
  MONTERREY_LAT_MAX,
  MONTERREY_LAT_MIN,
  MONTERREY_LNG_MAX,
  MONTERREY_LNG_MIN,
} from "@/lib/geo/bounds";

/** CO-F8-001: mismo clamp FE/BE; sin Math.round (rompe 0.5). */
export const MIN_RADIUS_KM = 0.5;
export const MAX_RADIUS_KM = 10;
export const DEFAULT_RADIUS_KM = 10;

const MEXICO_OUT_OF_BOUNDS = "Ubicación fuera de México";
const MONTERREY_OUT_OF_BOUNDS = "Ubicación fuera del área de Monterrey";

export const monterreyLatSchema = z
  .number({ invalid_type_error: MONTERREY_OUT_OF_BOUNDS })
  .min(MONTERREY_LAT_MIN, MONTERREY_OUT_OF_BOUNDS)
  .max(MONTERREY_LAT_MAX, MONTERREY_OUT_OF_BOUNDS);

export const monterreyLngSchema = z
  .number({ invalid_type_error: MONTERREY_OUT_OF_BOUNDS })
  .min(MONTERREY_LNG_MIN, MONTERREY_OUT_OF_BOUNDS)
  .max(MONTERREY_LNG_MAX, MONTERREY_OUT_OF_BOUNDS);

export const mexicoLatSchema = z
  .number({ invalid_type_error: MEXICO_OUT_OF_BOUNDS })
  .min(MEXICO_BOUNDS.south, MEXICO_OUT_OF_BOUNDS)
  .max(MEXICO_BOUNDS.north, MEXICO_OUT_OF_BOUNDS);

export const mexicoLngSchema = z
  .number({ invalid_type_error: MEXICO_OUT_OF_BOUNDS })
  .min(MEXICO_BOUNDS.west, MEXICO_OUT_OF_BOUNDS)
  .max(MEXICO_BOUNDS.east, MEXICO_OUT_OF_BOUNDS);

function optionalNumber(raw: string | null): number | undefined {
  if (raw === null || raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : Number.NaN;
}

export const geoListQuerySchema = z
  .object({
    lat: z.string().nullable().optional(),
    lng: z.string().nullable().optional(),
    radiusKm: z.string().nullable().optional(),
  })
  .superRefine((val, ctx) => {
    const hasLat = val.lat !== undefined && val.lat !== null && val.lat !== "";
    const hasLng = val.lng !== undefined && val.lng !== null && val.lng !== "";
    const hasRadius =
      val.radiusKm !== undefined && val.radiusKm !== null && val.radiusKm !== "";

    if (hasLat !== hasLng) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: hasLat ? ["lng"] : ["lat"],
        message: "lat y lng deben enviarse juntos",
      });
      return;
    }

    if (hasRadius && !hasLat) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["radiusKm"],
        message: "radiusKm requiere lat y lng",
      });
      return;
    }

    if (!hasLat) return;

    const lat = optionalNumber(val.lat ?? null);
    const lng = optionalNumber(val.lng ?? null);
    if (!Number.isFinite(lat)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lat"],
        message: "Debe ser un número",
      });
      return;
    }
    if (!Number.isFinite(lng)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lng"],
        message: "Debe ser un número",
      });
      return;
    }

    const latCheck = mexicoLatSchema.safeParse(lat);
    if (!latCheck.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lat"],
        message: MEXICO_OUT_OF_BOUNDS,
      });
    }
    const lngCheck = mexicoLngSchema.safeParse(lng);
    if (!lngCheck.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lng"],
        message: MEXICO_OUT_OF_BOUNDS,
      });
    }

    if (hasRadius) {
      const radius = optionalNumber(val.radiusKm ?? null);
      if (!Number.isFinite(radius)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["radiusKm"],
          message: "Debe ser un número",
        });
      }
    }
  })
  .transform((val) => {
    const hasLat = val.lat !== undefined && val.lat !== null && val.lat !== "";
    if (!hasLat) {
      return { geo: null as { lat: number; lng: number; radiusKm: number } | null };
    }
    const lat = Number(val.lat);
    const lng = Number(val.lng);
    const rawRadius =
      val.radiusKm !== undefined && val.radiusKm !== null && val.radiusKm !== ""
        ? Number(val.radiusKm)
        : DEFAULT_RADIUS_KM;
    return { geo: { lat, lng, radiusKm: clampGeoRadiusKm(rawRadius) } };
  });

/** CO-F7-001: el servidor no deriva radio del viewport; CO-F8-001 clamp 0.5–10 (no 400). */
export function clampGeoRadiusKm(value: number): number {
  if (value < MIN_RADIUS_KM) return MIN_RADIUS_KM;
  if (value > MAX_RADIUS_KM) return MAX_RADIUS_KM;
  return value;
}

export const etaQuerySchema = z
  .object({
    lat: z.string().nullable().optional(),
    lng: z.string().nullable().optional(),
    fulfillmentType: z.enum(["PICKUP", "DELIVERY"]).optional().default("PICKUP"),
  })
  .superRefine((val, ctx) => {
    const hasLat = val.lat !== undefined && val.lat !== null && val.lat !== "";
    const hasLng = val.lng !== undefined && val.lng !== null && val.lng !== "";
    if (hasLat !== hasLng) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: hasLat ? ["lng"] : ["lat"],
        message: "lat y lng deben enviarse juntos",
      });
      return;
    }
    if (!hasLat) return;
    const lat = Number(val.lat);
    const lng = Number(val.lng);
    if (!monterreyLatSchema.safeParse(lat).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lat"],
        message: "Ubicación fuera del área de Monterrey",
      });
    }
    if (!monterreyLngSchema.safeParse(lng).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lng"],
        message: "Ubicación fuera del área de Monterrey",
      });
    }
  })
  .transform((val) => {
    const hasLat = val.lat !== undefined && val.lat !== null && val.lat !== "";
    return {
      lat: hasLat ? Number(val.lat) : null,
      lng: hasLat ? Number(val.lng) : null,
      fulfillmentType: val.fulfillmentType ?? "PICKUP",
    };
  });
