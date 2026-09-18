import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { applyActiveProviderCookie, requireActiveProvider } from "@/lib/auth/active-provider";
import { apiError, fromZodError } from "@/lib/api/response";
import { handleOrderRouteError } from "@/lib/orders/http";
import { getBranchInventoryReport } from "@/lib/services/inventory-report.service";
import {
  PaginationValidationError,
  parseStrictPagination,
} from "@/lib/services/pagination";

const dateQuery = z
  .object({
    from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    to: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  })
  .refine((value) => (value.from && value.to) || (!value.from && !value.to), {
    message: "from y to deben enviarse juntos",
  });

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireActiveProvider(request);
    const search = new URL(request.url).searchParams;
    const { page, limit, skip } = parseStrictPagination(search, {
      defaultLimit: 50,
      maxLimit: 100,
    });
    const dates = dateQuery.parse({
      from: search.get("from") ?? undefined,
      to: search.get("to") ?? undefined,
    });
    const result = await getBranchInventoryReport({
      userId: ctx.session.sub,
      providerId: ctx.provider.id,
      page,
      limit,
      skip,
      from: dates.from,
      to: dates.to,
    });
    return applyActiveProviderCookie(
      NextResponse.json({ data: result.data, meta: result.meta }),
      ctx.provider.id
    );
  } catch (err) {
    if (err instanceof PaginationValidationError) {
      return apiError(err.message, 400, err.details);
    }
    if (err instanceof z.ZodError) {
      return apiError("Validation failed", 400, fromZodError(err));
    }
    return handleOrderRouteError(err);
  }
}
