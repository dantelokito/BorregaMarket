import { z } from "zod";

const decimalString = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim().replace(",", "."));

function parseOptionalNullableDecimal(
  field: string,
  emptyMessage: string,
  nonPositiveMessage: string
) {
  return z
    .union([decimalString, z.null()])
    .optional()
    .superRefine((value, ctx) => {
      if (value === undefined || value === null) return;
      if (!/^-?\d+(\.\d+)?$/.test(value)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: emptyMessage });
        return;
      }
      if (Number(value) <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: nonPositiveMessage });
      }
    });
}

export const inventoryListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const patchInventorySchema = z
  .object({
    capacityMax: parseOptionalNullableDecimal(
      "capacityMax",
      "El tope no es numérico",
      "El tope debe ser mayor que cero"
    ),
    alertThresholdPercent: z
      .number({ invalid_type_error: "El umbral debe ser un entero entre 1 y 100" })
      .int("El umbral debe ser un entero entre 1 y 100")
      .min(1, "El umbral debe ser un entero entre 1 y 100")
      .max(100, "El umbral debe ser un entero entre 1 y 100")
      .optional(),
    alertEnabled: z.boolean().optional(),
    boxContentFactor: parseOptionalNullableDecimal(
      "boxContentFactor",
      "El factor de caja no es numérico",
      "El factor de caja debe ser mayor que cero"
    ),
  })
  .strict()
  .refine(
    (data) =>
      data.capacityMax !== undefined ||
      data.alertThresholdPercent !== undefined ||
      data.alertEnabled !== undefined ||
      data.boxContentFactor !== undefined,
    { message: "Indica al menos un campo" }
  );

export const inventoryEntrySchema = z
  .object({
    quantity: decimalString.superRefine((value, ctx) => {
      if (!/^-?\d+(\.\d+)?$/.test(value) || Number(value) <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La cantidad debe ser mayor que cero",
        });
      }
    }),
    receiveAs: z.enum(["CATALOG", "BOX"]).optional().default("CATALOG"),
  })
  .strict();

export type PatchInventoryInput = z.infer<typeof patchInventorySchema>;
export type InventoryEntryInput = z.infer<typeof inventoryEntrySchema>;
