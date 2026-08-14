import { z } from "zod";
import {
  FulfillmentType,
  OrderStatus,
  PaymentMethod,
  UnitOfMeasure,
} from "@prisma/client";
import { Decimal, hasMaxDecimals, isPositive } from "@/lib/money";
import { monterreyLatSchema, monterreyLngSchema } from "@/lib/validators/geo";

const cuidLike = z.string().min(1, "Requerido");

export const quantitySchema = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .refine((value) => hasMaxDecimals(value, 3), "Máximo 3 decimales")
  .refine((value) => {
    try {
      return isPositive(value);
    } catch {
      return false;
    }
  }, "Debe ser mayor a 0");

export const unitPriceSchema = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .refine((value) => hasMaxDecimals(value, 2), "Máximo 2 decimales")
  .refine((value) => {
    try {
      const amount = new Decimal(value);
      return amount.gt(0) && amount.lte("99999.99");
    } catch {
      return false;
    }
  }, "Debe ser mayor a 0 y menor o igual a 99999.99");

export const unitOfMeasureSchema = z
  .nativeEnum(UnitOfMeasure)
  .default(UnitOfMeasure.PZA);

export const idempotencyHeaderSchema = z.object({
  "Idempotency-Key": z
    .string({ required_error: "Requerido", invalid_type_error: "Requerido" })
    .uuid("Debe ser un UUID"),
});

const marketplaceItemSchema = z
  .object({
    providerProductId: cuidLike,
    quantity: quantitySchema,
    unitOfMeasure: unitOfMeasureSchema,
    customItem: z.any().optional(),
    unitPrice: z.any().optional(),
    subtotal: z.any().optional(),
    total: z.any().optional(),
  })
  .superRefine((item, ctx) => {
    if (item.customItem !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customItem"],
        message: "No permitido en pedido marketplace",
      });
    }
  });

export const createMarketplaceOrderSchema = z
  .object({
    providerId: cuidLike,
    notes: z.string().trim().max(280).optional().nullable(),
    items: z
      .array(marketplaceItemSchema)
      .min(1, "El pedido no puede estar vacío")
      .max(50, "Máximo 50 líneas"),
    fulfillmentType: z.nativeEnum(FulfillmentType).optional().default(FulfillmentType.PICKUP),
    deliveryAddressId: z.string().min(1).optional(),
    clientLat: monterreyLatSchema.optional(),
    clientLng: monterreyLngSchema.optional(),
  })
  .superRefine((body, ctx) => {
    const hasLat = body.clientLat !== undefined;
    const hasLng = body.clientLng !== undefined;
    if (hasLat !== hasLng) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: hasLat ? ["clientLng"] : ["clientLat"],
        message: "lat y lng deben enviarse juntos",
      });
    }
    if (body.fulfillmentType === FulfillmentType.DELIVERY && !body.deliveryAddressId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["deliveryAddressId"],
        message: "Requerido para entrega a domicilio",
      });
    }
  });

export const patchOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus, {
    errorMap: () => ({ message: "Estado no válido" }),
  }),
});

export const listOrdersQuerySchema = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
});

const posCustomItemSchema = z.object({
  name: z.string().trim().min(1, "Requerido").max(80),
  unitPrice: unitPriceSchema,
});

const posLineSchema = z
  .object({
    providerProductId: cuidLike.optional(),
    customItem: posCustomItemSchema.optional(),
    quantity: quantitySchema,
    unitOfMeasure: unitOfMeasureSchema,
  })
  .superRefine((item, ctx) => {
    const hasCatalog = Boolean(item.providerProductId);
    const hasCustom = item.customItem != null;
    if (hasCatalog === hasCustom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cada línea debe tener providerProductId o customItem, no ambos",
      });
    }
  });

export const createPosSaleSchema = z.object({
  paymentMethod: z.enum([
    PaymentMethod.CASH,
    PaymentMethod.OTHER,
    PaymentMethod.UNPAID,
  ]),
  status: z
    .enum([OrderStatus.DELIVERED, OrderStatus.CONFIRMED])
    .default(OrderStatus.DELIVERED),
  customerName: z.string().trim().max(80).optional().nullable(),
  items: z
    .array(posLineSchema)
    .min(1, "El ticket no puede estar vacío")
    .max(50, "Máximo 50 líneas"),
});

export const providerOrdersQuerySchema = z.object({
  tab: z.enum(["active", "completed", "cancelled"]).default("active"),
  status: z.nativeEnum(OrderStatus).optional(),
  source: z.enum(["MARKETPLACE", "POS"]).optional(),
});

export const dashboardQuerySchema = z.object({
  range: z.enum(["1d", "7d", "30d"]).default("30d"),
});

export type CreateMarketplaceOrderInput = z.infer<
  typeof createMarketplaceOrderSchema
>;
export type CreatePosSaleInput = z.infer<typeof createPosSaleSchema>;
export type PatchOrderStatusInput = z.infer<typeof patchOrderStatusSchema>;
