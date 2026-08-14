import { z } from "zod";
import { isValidGoogleMapsUrl, isValidGooglePlaceId } from "@/lib/validation/google-maps";

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
  })
  .strict();

export type PatchProviderSettingsInput = z.infer<typeof patchProviderSettingsSchema>;

export function bodyTouchesGoogle(body: PatchProviderSettingsInput): boolean {
  return (
    body.googlePlaceId !== undefined ||
    body.googleMapsUrl !== undefined ||
    body.googleReviewsEnabled !== undefined
  );
}
