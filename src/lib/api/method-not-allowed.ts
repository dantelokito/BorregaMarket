import { NextResponse } from "next/server";

const DELETE_PRODUCT_MESSAGE = "No se puede eliminar el producto";

export function methodNotAllowedDeleteProduct(allow: string, variant: "admin" | "provider") {
  const message =
    variant === "admin"
      ? "Usa isActive=false o archivo de oferta. DELETE no está permitido"
      : "Oculta la oferta o inactiva el SKU. DELETE no está permitido";
  return NextResponse.json(
    {
      error: DELETE_PRODUCT_MESSAGE,
      details: [{ field: "id", message }],
    },
    { status: 405, headers: { Allow: allow } }
  );
}
