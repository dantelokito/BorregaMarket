import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { RateLimitError } from "@/lib/rate-limit/token-bucket";
import { LastAdminError } from "@/lib/auth/assert-not-last-admin";
import { PaginationValidationError } from "@/lib/services/pagination";
import {
  EncargarActiveError,
  ConfirmDiscardRequiredError,
  OfferArchivedError,
  InvalidOfferPriceError,
} from "@/lib/catalog/offer";

export interface FieldError {
  field: string;
  message: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function paginated<T>(data: T[], meta: PaginationMeta) {
  return NextResponse.json({ data, meta });
}

export function apiError(
  message: string,
  status: number,
  details?: FieldError[]
) {
  return NextResponse.json(
    { error: message, ...(details && details.length > 0 && { details }) },
    { status }
  );
}

export function apiCodedError(
  code: string,
  message: string,
  status: number,
  details?: FieldError[]
) {
  return NextResponse.json(
    {
      error: { code, message },
      timestamp: new Date().toISOString(),
      ...(details && details.length > 0 ? { details } : {}),
    },
    { status }
  );
}

export function fromZodError(error: ZodError): FieldError[] {
  return error.errors.map((e) => ({
    field: e.path.join(".") || "body",
    message: e.message,
  }));
}

export function handleRouteError(err: unknown) {
  if (err instanceof ZodError) {
    const details = fromZodError(err);
    return apiError("Validation failed", 400, details);
  }
  if (err instanceof RateLimitError) {
    return apiError(err.message, 429);
  }
  if (err instanceof LastAdminError) {
    return apiError(err.message, 409, err.details());
  }
  if (err instanceof PaginationValidationError) {
    return apiError(err.message, 400, err.details);
  }
  if (err instanceof EncargarActiveError) {
    return apiError(err.message, 409, err.details());
  }
  if (err instanceof ConfirmDiscardRequiredError) {
    return apiError(err.message, 400, err.details());
  }
  if (err instanceof OfferArchivedError) {
    return apiError(err.message, 409, err.details());
  }
  if (err instanceof InvalidOfferPriceError) {
    return apiError(err.message, 400, err.details());
  }
  return apiError("Error interno", 500);
}
