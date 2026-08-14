import type { FieldError, PaginationMeta } from "./types";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: FieldError[]
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ApiEnvelope<T> {
  data?: T;
  meta?: PaginationMeta;
  error?: string;
  details?: FieldError[];
}

export interface ApiResult<T> {
  data: T;
  meta?: PaginationMeta;
}

async function parseResponse<T>(res: Response): Promise<ApiResult<T>> {
  const body: ApiEnvelope<T> = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(body.error ?? "Error de servidor", res.status, body.details);
  }

  return { data: body.data as T, meta: body.meta };
}

export type ApiRequestOptions = {
  headers?: Record<string, string>;
};

export async function apiGet<T>(url: string, options?: ApiRequestOptions): Promise<ApiResult<T>> {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  return parseResponse<T>(res);
}

export async function apiPost<T>(
  url: string,
  body?: unknown,
  options?: ApiRequestOptions
): Promise<ApiResult<T>> {
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return parseResponse<T>(res);
}

export async function apiPatch<T>(
  url: string,
  body: unknown,
  options?: ApiRequestOptions
): Promise<ApiResult<T>> {
  const res = await fetch(url, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: JSON.stringify(body),
  });
  return parseResponse<T>(res);
}

export async function apiDelete<T>(url: string, options?: ApiRequestOptions): Promise<ApiResult<T>> {
  const res = await fetch(url, {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  return parseResponse<T>(res);
}

/** Multipart upload (do not set Content-Type — browser sets boundary) */
export async function apiPostForm<T>(url: string, form: FormData): Promise<ApiResult<T>> {
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    body: form,
  });
  return parseResponse<T>(res);
}

export function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}
