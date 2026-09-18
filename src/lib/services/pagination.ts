import type { PaginationMeta } from "@/lib/api/response";

interface PaginationOptions {
  defaultLimit?: number;
  maxLimit?: number;
}

export class PaginationValidationError extends Error {
  constructor(
    message: string,
    public details: { field: string; message: string }[]
  ) {
    super(message);
    this.name = "PaginationValidationError";
  }
}

export function parsePaginationParams(
  searchParams: URLSearchParams,
  options: PaginationOptions = {}
) {
  const { defaultLimit = 20, maxLimit = 50 } = options;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const rawLimit = parseInt(searchParams.get("limit") ?? String(defaultLimit), 10) || defaultLimit;
  const limit = Math.min(maxLimit, Math.max(1, rawLimit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

/** F13 admin/panel: page/limit inválidos → 400 (no recortar en silencio). */
export function parseStrictPagination(
  searchParams: URLSearchParams,
  options: PaginationOptions = {}
) {
  const { defaultLimit = 50, maxLimit = 100 } = options;
  const pageRaw = searchParams.get("page");
  const limitRaw = searchParams.get("limit");
  const page = pageRaw == null || pageRaw === "" ? 1 : Number(pageRaw);
  const limit = limitRaw == null || limitRaw === "" ? defaultLimit : Number(limitRaw);
  if (!Number.isInteger(page) || page < 1) {
    throw new PaginationValidationError("Datos inválidos", [
      { field: "page", message: "page debe ser un entero ≥ 1" },
    ]);
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > maxLimit) {
    throw new PaginationValidationError("Datos inválidos", [
      { field: "limit", message: `limit debe ser un entero entre 1 y ${maxLimit}` },
    ]);
  }
  return { page, limit, skip: (page - 1) * limit };
}

export function buildMeta(page: number, limit: number, total: number): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 0,
  };
}
