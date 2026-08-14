import { z } from "zod";

export const updateClientProfileSchema = z.object({
  name: z.string().min(2, "Nombre requerido").optional(),
  phone: z.string().nullable().optional(),
});

export type UpdateClientProfileInput = z.infer<typeof updateClientProfileSchema>;
