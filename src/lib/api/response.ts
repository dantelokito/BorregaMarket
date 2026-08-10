import { NextResponse } from "next/server";
import { ZodError } from "zod";

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
  return apiError("Error interno", 500);
}
