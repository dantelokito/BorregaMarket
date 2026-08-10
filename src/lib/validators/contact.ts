import { z } from "zod";

export const contactBodySchema = z.object({
  source: z
    .enum(["call_button", "whatsapp_button", "other"], {
      errorMap: () => ({ message: "Valor no permitido" }),
    })
    .default("call_button"),
  productIds: z
    .array(z.string().min(1))
    .max(10, "Máximo 10 productos")
    .default([]),
});

export type ContactBodyInput = z.infer<typeof contactBodySchema>;
