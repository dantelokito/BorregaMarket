import type { PaginationMeta } from "@/lib/api/response";

interface PaginationOptions {
  defaultLimit?: number;
  maxLimit?: number;
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

export function buildMeta(page: number, limit: number, total: number): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 0,
  };
}
