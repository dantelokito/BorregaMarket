import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { getSession, requireRole, AuthError } from "@/lib/auth/session";
import { ok, apiError, handleRouteError } from "@/lib/api/response";
import { createAddressSchema } from "@/lib/validators/address";
import {
  createAddress,
  listAddresses,
  AddressLimitError,
} from "@/lib/services/address.service";

/** Cliente: listar direcciones favoritas */
export async function GET(request: NextRequest) {
  try {
    const session = requireRole(getSession(request), UserRole.CLIENT);
    const data = await listAddresses(session.sub);
    return ok(data);
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError(err.message, err.status);
    }
    return handleRouteError(err);
  }
}

/** Cliente: guardar pin / dirección */
export async function POST(request: NextRequest) {
  try {
    const session = requireRole(getSession(request), UserRole.CLIENT);
    const body = createAddressSchema.parse(await request.json());
    const data = await createAddress(session.sub, body);
    return ok(data, 201);
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError(err.message, err.status);
    }
    if (err instanceof AddressLimitError) {
      return apiError(err.message, 400);
    }
    if (err instanceof SyntaxError) {
      return apiError("Validation failed", 400, [
        { field: "body", message: "JSON inválido" },
      ]);
    }
    return handleRouteError(err);
  }
}
