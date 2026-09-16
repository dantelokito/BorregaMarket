import { Prisma, ProductUnit } from "@prisma/client";
import { toDecimal } from "@/lib/money";
import { formatOnHand } from "@/lib/inventory/convert-qty";
import { effectiveSaleUnit } from "@/lib/catalog/sellable";

export class EncargarActiveError extends Error {
  details() {
    return [
      {
        field: "saleUnit",
        message: "No se puede cambiar unidad o factor con Encargar activo",
        code: "ENCARGAR_ACTIVE",
      },
    ];
  }
  constructor(message = "Hay encargos activos") {
    super(message);
    this.name = "EncargarActiveError";
  }
}

export class ConfirmDiscardRequiredError extends Error {
  details() {
    return [
      {
        field: "confirmDiscard",
        message: "Confirma el descarte de inventario al cambiar unidad o factor",
      },
    ];
  }
  constructor(message = "Se requiere confirmDiscard") {
    super(message);
    this.name = "ConfirmDiscardRequiredError";
  }
}

export class OfferArchivedError extends Error {
  details() {
    return [
      {
        field: "providerProductId",
        message: "No se cargan entradas sobre una oferta oculta",
      },
    ];
  }
  constructor(message = "Oferta oculta") {
    super(message);
    this.name = "OfferArchivedError";
  }
}

export class RestoreOfferNotFoundError extends Error {
  constructor(message = "No hay oferta oculta para restaurar") {
    super(message);
    this.name = "RestoreOfferNotFoundError";
  }
}

export class MasterMutationForbiddenError extends Error {
  details() {
    return [
      { field: "unit", message: "No se muta Product.unit GLOBAL. Usa saleUnit." },
    ];
  }
  constructor(message = "No se puede mutar el maestro GLOBAL") {
    super(message);
    this.name = "MasterMutationForbiddenError";
  }
}

export class OfferValidationError extends Error {
  constructor(
    message: string,
    public details: { field: string; message: string }[]
  ) {
    super(message);
    this.name = "OfferValidationError";
  }
}

type Tx = Prisma.TransactionClient;

export async function insertPriceHistory(
  tx: Tx,
  params: {
    providerProductId: string;
    price: Prisma.Decimal | string | number;
    previousPrice: Prisma.Decimal | string | number | null;
    changedByUserId: string;
  }
) {
  await tx.providerProductPriceHistory.create({
    data: {
      providerProductId: params.providerProductId,
      price: toDecimal(params.price),
      previousPrice:
        params.previousPrice === null ? null : toDecimal(params.previousPrice),
      changedByUserId: params.changedByUserId,
    },
  });
}

export function assertCajaFactor(
  unit: ProductUnit,
  boxContentFactor: Prisma.Decimal | string | number | null | undefined
) {
  if (unit !== ProductUnit.CAJA) return;
  if (boxContentFactor == null || toDecimal(boxContentFactor).lte(0)) {
    throw new OfferValidationError("Datos inválidos", [
      { field: "boxContentFactor", message: "CAJA requiere boxContentFactor mayor que cero" },
    ]);
  }
}

export function assertUnitFactorChangeAllowed(params: {
  reserved: Prisma.Decimal;
  onHand: Prisma.Decimal;
  unitOrFactorChanged: boolean;
  confirmDiscard?: boolean;
}): { discardOnHand: boolean } {
  if (!params.unitOrFactorChanged) return { discardOnHand: false };
  if (params.reserved.gt(0)) {
    throw new EncargarActiveError();
  }
  if (!params.onHand.eq(0)) {
    if (params.confirmDiscard !== true) {
      throw new ConfirmDiscardRequiredError();
    }
    return { discardOnHand: true };
  }
  return { discardOnHand: false };
}

export function offerPanelFields(row: {
  archivedAt: Date | null;
  saleUnit: ProductUnit | null;
  boxContentFactor: Prisma.Decimal | null;
  product: { unit: ProductUnit; scope: string; ownerProviderId: string | null };
  providerId: string;
}) {
  const effective = effectiveSaleUnit(row.saleUnit, row.product.unit);
  return {
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
    saleUnit: row.saleUnit,
    effectiveSaleUnit: effective,
    boxContentFactor: row.boxContentFactor ? formatOnHand(row.boxContentFactor) : null,
    canEditMaster:
      row.product.scope === "LOCAL" && row.product.ownerProviderId === row.providerId,
  };
}
