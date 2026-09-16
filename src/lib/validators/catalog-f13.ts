import { z } from "zod";

const decimal2 = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Máximo 2 decimales")
  .refine((v) => Number(v) >= 0, { message: "El precio no puede ser negativo" });

const factor3 = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,3})?$/, "Máximo 3 decimales")
  .refine((v) => Number(v) > 0, { message: "El factor debe ser mayor a 0" });

export const PRODUCT_UNIT_ENUM = z.enum([
  "KG",
  "PIEZA",
  "MANOJO",
  "CAJA",
  "LITRO",
  "GRAMO",
]);

export const offerPatchSchema = z
  .object({
    price: decimal2.optional(),
    saleUnit: PRODUCT_UNIT_ENUM.nullable().optional(),
    boxContentFactor: z.union([factor3, z.literal(""), z.null()]).optional(),
    sectionId: z.string().min(1).nullable().optional(),
    isAvailable: z.boolean().optional(),
    confirmDiscard: z.boolean().optional(),
    name: z.string().trim().min(1).max(80).optional(),
    unit: PRODUCT_UNIT_ENUM.optional(),
  })
  .superRefine((data, ctx) => {
    const unit = data.saleUnit ?? data.unit;
    if (unit === "CAJA") {
      const f = data.boxContentFactor;
      if (!f || f === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["boxContentFactor"],
          message: "Indica el factor de caja",
        });
      }
    }
  });

export const offerPriceSchema = z.object({
  price: z.union([
    decimal2,
    z.number().min(0).refine((n) => Math.round(n * 100) === n * 100, {
      message: "Máximo 2 decimales",
    }),
  ]),
});

export const adminProductListF13QuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  isActive: z.enum(["true", "false", ""]).optional(),
  scope: z.enum(["GLOBAL", "LOCAL", ""]).optional(),
  ownerProviderId: z.string().trim().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.union([z.literal(50), z.literal(100)]).default(50),
});

export type OfferPatchInput = z.infer<typeof offerPatchSchema>;
