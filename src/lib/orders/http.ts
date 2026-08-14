import { NextResponse } from "next/server";
import { AuthError } from "@/lib/auth/session";
import { apiError, handleRouteError } from "@/lib/api/response";
import { ProviderNotFoundError } from "@/lib/services/provider.service";
import { AddressNotFoundError } from "@/lib/services/address.service";
import {
  InvalidTransitionError,
  OrderForbiddenError,
  OrderNotFoundError,
  OrderValidationError,
  ProductUnavailableError,
} from "@/lib/orders/errors";

export function handleOrderRouteError(err: unknown): NextResponse {
  if (err instanceof AuthError) {
    return apiError(err.message, err.status);
  }
  if (err instanceof ProductUnavailableError) {
    return apiError(err.message, 409);
  }
  if (err instanceof InvalidTransitionError) {
    return apiError(err.message, 409);
  }
  if (err instanceof OrderNotFoundError) {
    return apiError(err.message, 404);
  }
  if (err instanceof OrderForbiddenError) {
    return apiError(err.message, 403);
  }
  if (err instanceof ProviderNotFoundError) {
    return apiError(err.message, 404);
  }
  if (err instanceof OrderValidationError) {
    return apiError(err.message, 400, err.details);
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
