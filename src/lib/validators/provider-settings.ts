import { z } from "zod";
import { isValidGoogleMapsUrl, isValidGooglePlaceId } from "@/lib/validation/google-maps";
import {
  BRAND_PAIR_MESSAGE,
  HEX_FORMAT_MESSAGE,
  PRIMARY_CONTRAST_MESSAGE,
  SECONDARY_CONTRAST_MESSAGE,
  isPrimaryContrastValid,
  isSecondaryContrastValid,
} from "@/lib/color/contrast";

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

  if (!isPrimaryContrastValid(data.primaryColor)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["primaryColor"],
      message: PRIMARY_CONTRAST_MESSAGE,
    });
  }
  if (!isSecondaryContrastValid(data.secondaryColor as string)) {
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
  })
  .strict()
  .superRefine(brandPairSuperRefine);

export type PatchProviderSettingsInput = z.infer<typeof patchProviderSettingsSchema>;

export const patchAdminProviderSchema = z
  .object({
    isVerified: z.boolean().optional(),
    primaryColor: hexOrNull.optional(),
    secondaryColor: hexOrNull.optional(),
  })
  .strict()
  .superRefine(brandPairSuperRefine)
  .refine(
    (data) =>
      data.isVerified !== undefined ||
      data.primaryColor !== undefined ||
      data.secondaryColor !== undefined,
    { message: "Indica isVerified o un par de colores" }
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
