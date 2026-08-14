import { z } from "zod";

export const createReviewSchema = z.object({
  rating: z
    .number({ invalid_type_error: "Debe ser un entero entre 1 y 5" })
    .int("Debe ser un entero entre 1 y 5")
    .min(1, "Debe ser un entero entre 1 y 5")
    .max(5, "Debe ser un entero entre 1 y 5"),
  comment: z
    .string()
    .max(1000, "Máximo 1000 caracteres")
    .optional()
    .nullable()
    .transform((value) => {
      if (value === undefined || value === null) return null;
      const trimmed = value.trim();
      return trimmed.length === 0 ? null : trimmed;
    }),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export function formatAuthorName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Cliente";
  if (parts.length === 1) return parts[0];
  const initial = parts[parts.length - 1][0]?.toUpperCase() ?? "";
  return initial ? `${parts[0]} ${initial}.` : parts[0];
}
