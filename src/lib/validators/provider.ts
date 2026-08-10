import { z } from "zod";

const MONTERREY_LAT_MIN = 25.4;
const MONTERREY_LAT_MAX = 25.9;
const MONTERREY_LNG_MIN = -100.6;
const MONTERREY_LNG_MAX = -99.8;

export const createProviderSchema = z.object({
  businessName: z.string().min(2, "Nombre del negocio requerido (mínimo 2 caracteres)"),
  address: z.string().min(1, "Dirección requerida"),
  city: z.string().min(1).default("Monterrey"),
  latitude: z
    .number()
    .min(MONTERREY_LAT_MIN, "Ubicación fuera del área de Monterrey")
    .max(MONTERREY_LAT_MAX, "Ubicación fuera del área de Monterrey"),
  longitude: z
    .number()
    .min(MONTERREY_LNG_MIN, "Ubicación fuera del área de Monterrey")
    .max(MONTERREY_LNG_MAX, "Ubicación fuera del área de Monterrey"),
  phone: z.string().optional(),
  description: z.string().optional(),
});

export type CreateProviderInput = z.infer<typeof createProviderSchema>;
