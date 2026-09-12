import { NextRequest } from "next/server";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { getSession, requireRole, AuthError } from "@/lib/auth/session";
import { ok, apiError, fromZodError, handleRouteError } from "@/lib/api/response";
import { createSectionSchema } from "@/lib/validators/catalog-f10";
import {
  createProviderSection,
  listProviderSections,
} from "@/lib/services/section.service";
import { CatalogConflictError } from "@/lib/services/local-product.service";
import { ProviderNotFoundError } from "@/lib/services/provider.service";

export async function GET(request: NextRequest) {
  try {
    const session = requireRole(getSession(request), UserRole.PROVIDER);
    const data = await listProviderSections(session.sub);
    return ok(data);
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError(err.message, err.status);
    }
    if (err instanceof ProviderNotFoundError) {
      return apiError(err.message, 404);
    }
    return handleRouteError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = requireRole(getSession(request), UserRole.PROVIDER);
    const body = createSectionSchema.parse(await request.json());
    const created = await createProviderSection({
      userId: session.sub,
      name: body.name,
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
    });
    return ok(created, 201);
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError(err.message, err.status);
    }
    if (err instanceof CatalogConflictError) {
      return apiError(err.message, 409, [
        { field: "name", message: err.message },
      ]);
    }
    if (err instanceof ProviderNotFoundError) {
      return apiError(err.message, 404);
    }
    if (err instanceof z.ZodError) {
      return apiError("Validation failed", 400, fromZodError(err));
    }
    return handleRouteError(err);
  }
}
