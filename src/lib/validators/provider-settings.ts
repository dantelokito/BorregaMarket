import { z } from "zod";
import { isValidGoogleMapsUrl, isValidGooglePlaceId } from "@/lib/validation/google-maps";
import { monterreyLatSchema, monterreyLngSchema } from "@/lib/validators/geo";
import {
  BRAND_PAIR_MESSAGE,
  HEX_FORMAT_MESSAGE,
  PRIMARY_CONTRAST_MESSAGE,
  SECONDARY_CONTRAST_MESSAGE,
  isPrimaryContrastValid,
  isSecondaryContrastValid,
} from "@/lib/color/contrast";

const hhMm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Usa HH:mm (24h)");

function hhMmToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

export const openingHourDaySchema = z
  .object({
    day: z.number().int().min(0).max(6),
    open: z.string().nullable(),
    close: z.string().nullable(),
    closed: z.boolean(),
  })
  .superRefine((slot, ctx) => {
    if (slot.closed) {
      if (slot.open !== null || slot.close !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["open"],
          message: "Día cerrado debe tener open y close en null",
        });
      }
      return;
    }
    const openOk = hhMm.safeParse(slot.open);
    const closeOk = hhMm.safeParse(slot.close);
    if (!openOk.success || !closeOk.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["open"],
        message: "Día abierto requiere open y close en HH:mm",
      });
      return;
    }
    if (hhMmToMinutes(openOk.data) >= hhMmToMinutes(closeOk.data)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["close"],
        message: "open debe ser menor que close (mismo día)",
      });
    }
  });

export const openingHoursSchema = z
  .union([
    z.null(),
    z
      .array(openingHourDaySchema)
      .max(7, "Máximo 7 días")
      .superRefine((days, ctx) => {
        const seen = new Set<number>();
        for (const [i, slot] of days.entries()) {
          if (seen.has(slot.day)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [i, "day"],
              message: "day debe ser único (0–6)",
            });
          }
          seen.add(slot.day);
        }
      }),
  ])
  .optional();

const hexOrNull = z.union([
  z.string().regex(/^#[0-9A-Fa-f]{6}$/, HEX_FORMAT_MESSAGE),
  z.null(),
]);

export function brandPairSuperRefine(
  data: { primaryColor?: string | null; secondaryColor?: string | null },
  ctx: z.RefinementCtx
) {
  const hasPrimary = data.primaryColor !== undefined;
  const hasSecondary = data.secondaryColor !== undefined;
  if (!hasPrimary && !hasSecondary) return;

  if (!hasPrimary || !hasSecondary || (data.primaryColor === null) !== (data.secondaryColor === null)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["primaryColor"],
      message: BRAND_PAIR_MESSAGE,
    });
    return;
  }

  if (data.primaryColor === null) return;

  const primaryColor = data.primaryColor;
  const secondaryColor = data.secondaryColor;
  if (!primaryColor || !secondaryColor) return;

  if (!isPrimaryContrastValid(primaryColor)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["primaryColor"],
      message: PRIMARY_CONTRAST_MESSAGE,
    });
  }
  if (!isSecondaryContrastValid(secondaryColor)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["secondaryColor"],
      message: SECONDARY_CONTRAST_MESSAGE,
    });
  }
}

export const patchProviderSettingsSchema = z
  .object({
    preparationTimeMinutes: z
      .number({ invalid_type_error: "Debe ser un entero entre 5 y 120" })
      .int("Debe ser un entero entre 5 y 120")
      .min(5, "Debe ser un entero entre 5 y 120")
      .max(120, "Debe ser un entero entre 5 y 120")
      .optional(),
    offersDelivery: z.boolean().optional(),
    googlePlaceId: z
      .union([
        z
          .string()
          .min(10, "Place ID inválido")
          .max(255, "Place ID inválido")
          .refine(isValidGooglePlaceId, "Place ID inválido"),
        z.null(),
      ])
      .optional(),
    googleMapsUrl: z
      .union([
        z.string().refine(isValidGoogleMapsUrl, "URL de Google Maps inválida"),
        z.null(),
      ])
      .optional(),
    googleReviewsEnabled: z.boolean().optional(),
    primaryColor: hexOrNull.optional(),
    secondaryColor: hexOrNull.optional(),
    whatsappEnabled: z.boolean().optional(),
    acceptsCardAtStore: z.boolean().optional(),
    offersWholesale: z.boolean().optional(),
    offersRetail: z.boolean().optional(),
    posShowImages: z
      .boolean({ invalid_type_error: "Debe ser verdadero o falso" })
      .optional(),
    businessName: z.string().trim().min(2).max(80).optional(),
    address: z.string().trim().min(1).max(200).optional(),
    city: z.string().trim().min(1).max(80).optional(),
    phone: z.string().trim().min(1).max(20).optional(),
    description: z
      .union([z.string().trim().max(500), z.null()])
      .optional(),
    latitude: monterreyLatSchema.optional(),
    longitude: monterreyLngSchema.optional(),
    id: z.string().optional(),
    providerId: z.string().optional(),
    openingHours: openingHoursSchema,
  })
  .strict()
  .superRefine(brandPairSuperRefine)
  .superRefine((data, ctx) => {
    if (data.posShowImages !== undefined && typeof data.posShowImages !== "boolean") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["posShowImages"],
        message: "Debe ser verdadero o falso",
      });
    }
    const hasLat = data.latitude !== undefined;
    const hasLng = data.longitude !== undefined;
    if (hasLat !== hasLng) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: hasLat ? ["longitude"] : ["latitude"],
        message: "latitude y longitude deben enviarse juntos",
      });
    }
  });

export type PatchProviderSettingsInput = z.infer<typeof patchProviderSettingsSchema>;

export const patchAdminProviderSchema = z
  .object({
    isVerified: z.boolean().optional(),
    isActive: z.boolean().optional(),
    offersWholesale: z.boolean().optional(),
    offersDelivery: z.boolean().optional(),
    primaryColor: hexOrNull.optional(),
    secondaryColor: hexOrNull.optional(),
  })
  .strict()
  .superRefine(brandPairSuperRefine)
  .refine(
    (data) =>
      data.isVerified !== undefined ||
      data.isActive !== undefined ||
      data.offersWholesale !== undefined ||
      data.offersDelivery !== undefined ||
      data.primaryColor !== undefined ||
      data.secondaryColor !== undefined,
    { message: "Indica isVerified, isActive, flags o un par de colores" }
  );

export type PatchAdminProviderInput = z.infer<typeof patchAdminProviderSchema>;

export function bodyTouchesGoogle(body: PatchProviderSettingsInput): boolean {
  return (
    body.googlePlaceId !== undefined ||
    body.googleMapsUrl !== undefined ||
    body.googleReviewsEnabled !== undefined
  );
}

export function bodyTouchesBrand(
  body: Pick<PatchProviderSettingsInput, "primaryColor" | "secondaryColor">
): boolean {
  return body.primaryColor !== undefined || body.secondaryColor !== undefined;
}
