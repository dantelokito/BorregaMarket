import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { getSession, requireRole, AuthError } from "@/lib/auth/session";
import { ok, apiError, handleRouteError } from "@/lib/api/response";
import { patchAddressSchema } from "@/lib/validators/address";
import {
  deleteAddress,
  updateAddress,
  AddressNotFoundError,
} from "@/lib/services/address.service";

/** Cliente: actualizar dirección propia */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = requireRole(getSession(request), UserRole.CLIENT);
    const { id } = await params;
    const body = patchAddressSchema.parse(await request.json());
    const data = await updateAddress(session.sub, id, body);
    return ok(data);
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError(err.message, err.status);
    }
    if (err instanceof AddressNotFoundError) {
      return apiError(err.message, 404);
    }
    if (err instanceof SyntaxError) {
      return apiError("Validation failed", 400, [
        { field: "body", message: "JSON inválido" },
      ]);
    }
    return handleRouteError(err);
  }
}

/** Cliente: eliminar dirección propia (404 cruzado) */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = requireRole(getSession(request), UserRole.CLIENT);
    const { id } = await params;
    const data = await deleteAddress(session.sub, id);
    return ok(data);
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError(err.message, err.status);
    }
    if (err instanceof AddressNotFoundError) {
      return apiError(err.message, 404);
    }
    return handleRouteError(err);
  }
}
