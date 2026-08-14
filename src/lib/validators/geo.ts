import { z } from "zod";
import {
  MONTERREY_LAT_MAX,
  MONTERREY_LAT_MIN,
  MONTERREY_LNG_MAX,
  MONTERREY_LNG_MIN,
} from "@/lib/geo/bounds";

export const monterreyLatSchema = z
  .number({ invalid_type_error: "Ubicación fuera del área de Monterrey" })
  .min(MONTERREY_LAT_MIN, "Ubicación fuera del área de Monterrey")
  .max(MONTERREY_LAT_MAX, "Ubicación fuera del área de Monterrey");

export const monterreyLngSchema = z
  .number({ invalid_type_error: "Ubicación fuera del área de Monterrey" })
  .min(MONTERREY_LNG_MIN, "Ubicación fuera del área de Monterrey")
  .max(MONTERREY_LNG_MAX, "Ubicación fuera del área de Monterrey");

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
        message: "Ubicación fuera del área de Monterrey",
      });
      return;
    }
    if (!Number.isFinite(lng)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lng"],
        message: "Ubicación fuera del área de Monterrey",
      });
      return;
    }

    const latCheck = monterreyLatSchema.safeParse(lat);
    if (!latCheck.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lat"],
        message: "Ubicación fuera del área de Monterrey",
      });
    }
    const lngCheck = monterreyLngSchema.safeParse(lng);
    if (!lngCheck.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lng"],
        message: "Ubicación fuera del área de Monterrey",
      });
    }

    if (hasRadius) {
      const radius = optionalNumber(val.radiusKm ?? null);
      if (!Number.isFinite(radius) || radius! < 1 || radius! > 25) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["radiusKm"],
          message: "Debe estar entre 1 y 25",
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
    const radiusKm =
      val.radiusKm !== undefined && val.radiusKm !== null && val.radiusKm !== ""
        ? Number(val.radiusKm)
        : 10;
    return { geo: { lat, lng, radiusKm } };
  });

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
