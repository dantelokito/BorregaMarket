import { z } from "zod";
import { mexicoLatSchema, mexicoLngSchema } from "@/lib/validators/geo";

export const createAddressSchema = z.object({
  label: z.string().trim().min(1, "Etiqueta requerida").max(40, "Máximo 40 caracteres"),
  formattedAddress: z
    .string()
    .trim()
    .min(3, "Dirección demasiado corta")
    .max(255, "Máximo 255 caracteres"),
  lat: mexicoLatSchema,
  lng: mexicoLngSchema,
  isFavorite: z.boolean().optional().default(true),
  isDefault: z.boolean().optional().default(false),
});

export const patchAddressSchema = z
  .object({
    label: z.string().trim().min(1).max(40).optional(),
    formattedAddress: z.string().trim().min(3).max(255).optional(),
    lat: mexicoLatSchema.optional(),
    lng: mexicoLngSchema.optional(),
    isFavorite: z.boolean().optional(),
    isDefault: z.boolean().optional(),
  })
  .strict();

export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type PatchAddressInput = z.infer<typeof patchAddressSchema>;
