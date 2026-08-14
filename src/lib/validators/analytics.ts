import { z } from "zod";

export const analyticsRangeSchema = z.object({
  range: z
    .enum(["today", "7d", "30d"], {
      errorMap: () => ({ message: "Valor no permitido" }),
    })
    .optional()
    .default("7d"),
});

export type AnalyticsRange = z.infer<typeof analyticsRangeSchema>["range"];
