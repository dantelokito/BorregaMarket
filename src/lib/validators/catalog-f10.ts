import { z } from "zod";
import { ProductCategory, ProductUnit } from "@prisma/client";
import { hasHtml } from "@/lib/validation/plain-text";

const noHtmlName = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine((value) => !hasHtml(value), { message: "Sin HTML" });

export const adminProductListQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  isActive: z
    .enum(["true", "false", "1", "0"])
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      return value === "true" || value === "1";
    }),
  scope: z.enum(["GLOBAL", "LOCAL"]).optional(),
  ownerProviderId: z.string().cuid().optional(),
});

export const createAdminProductSchema = z
  .object({
    name: noHtmlName(80),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9-]+$/, "Slug inválido")
      .max(80)
      .optional(),
    description: z.string().trim().max(500).nullable().optional(),
    category: z.nativeEnum(ProductCategory),
    unit: z.nativeEnum(ProductUnit),
    isActive: z.boolean().optional(),
  })
  .strict();

export const patchAdminProductSchema = z
  .object({
    name: noHtmlName(80).optional(),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9-]+$/, "Slug inválido")
      .max(80)
      .optional(),
    description: z.string().trim().max(500).nullable().optional(),
    category: z.nativeEnum(ProductCategory).optional(),
    unit: z.nativeEnum(ProductUnit).optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Indica al menos un campo",
  });

export type CreateAdminProductInput = z.infer<typeof createAdminProductSchema>;
export type PatchAdminProductInput = z.infer<typeof patchAdminProductSchema>;

const moneyAmount = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .refine((value) => /^\d+(\.\d{1,2})?$/.test(value), { message: "Máximo 2 decimales" })
  .refine((value) => Number(value) >= 0, { message: "El precio debe ser ≥ 0" });

export const createLocalProductSchema = z
  .object({
    name: noHtmlName(80),
    unit: z.nativeEnum(ProductUnit),
    price: z.union([
      z.number().min(0).refine((n) => Number.isFinite(n) && Math.round(n * 100) === n * 100, {
        message: "Máximo 2 decimales",
      }),
      moneyAmount,
    ]),
    sectionId: z.string().cuid(),
    isAvailable: z.boolean().optional(),
    description: z.string().trim().max(500).nullable().optional(),
    boxContentFactor: z.union([z.string(), z.number()]).optional(),
  })
  .strict();

export const patchLocalProductSchema = z
  .object({
    name: noHtmlName(80).optional(),
    unit: z.nativeEnum(ProductUnit).optional(),
    saleUnit: z.nativeEnum(ProductUnit).nullable().optional(),
    price: z
      .union([
        z.number().min(0).refine((n) => Number.isFinite(n) && Math.round(n * 100) === n * 100, {
          message: "Máximo 2 decimales",
        }),
        moneyAmount,
      ])
      .optional(),
    sectionId: z.string().cuid().optional(),
    isAvailable: z.boolean().optional(),
    description: z.string().trim().max(500).nullable().optional(),
    boxContentFactor: z.union([z.string(), z.number(), z.null()]).optional(),
    confirmDiscard: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Indica al menos un campo",
  });

export const patchOfferByProductSchema = z
  .object({
    price: moneyAmount.optional(),
    saleUnit: z.nativeEnum(ProductUnit).nullable().optional(),
    boxContentFactor: z.union([z.string(), z.number(), z.null()]).optional(),
    sectionId: z.string().cuid().nullable().optional(),
    isAvailable: z.boolean().optional(),
    confirmDiscard: z.boolean().optional(),
    name: z.never().optional(),
    unit: z.never().optional(),
  })
  .strict();

export const patchOfferPriceSchema = z
  .object({
    price: moneyAmount,
  })
  .strict();

export const archivedQuerySchema = z
  .enum(["1", "true", "0", "false"])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    return value === "1" || value === "true";
  });

export const createSectionSchema = z
  .object({
    name: noHtmlName(40),
  })
  .strict();

export const patchSectionSchema = z
  .object({
    name: noHtmlName(40).optional(),
    sortOrder: z.number().int().min(0).optional(),
  })
  .strict()
  .refine((data) => data.name !== undefined || data.sortOrder !== undefined, {
    message: "Indica name o sortOrder",
  });

export const reorderSectionsSchema = z
  .object({
    ids: z.array(z.string().cuid()).min(1),
  })
  .strict();

export type CreateLocalProductInput = z.infer<typeof createLocalProductSchema>;
export type PatchLocalProductInput = z.infer<typeof patchLocalProductSchema>;
