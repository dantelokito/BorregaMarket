import { z } from "zod";
import { monterreyLatSchema, monterreyLngSchema } from "@/lib/validators/geo";

export const createProviderSchema = z.object({
  businessName: z.string().min(2, "Nombre del negocio requerido (mínimo 2 caracteres)"),
  address: z.string().min(1, "Dirección requerida"),
  city: z.string().min(1).default("Monterrey"),
  latitude: monterreyLatSchema,
  longitude: monterreyLngSchema,
  phone: z.string().optional(),
  description: z.string().optional(),
});

export type CreateProviderInput = z.infer<typeof createProviderSchema>;
