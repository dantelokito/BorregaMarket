import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { getSession, requireRole, AuthError } from "@/lib/auth/session";
import { hasModulePermission } from "@/lib/auth/permissions";
import { ok, apiError } from "@/lib/api/response";
import {
  AVAILABLE_CATALOGS,
  fetchCatalogData,
  getCatalogModule,
  CatalogNotFoundError,
} from "@/lib/services/catalog.service";

/** Catálogos del sistema — SOLO ADMIN */
export async function GET(request: NextRequest) {
  try {
    const session = requireRole(getSession(request), UserRole.ADMIN);
    const { searchParams } = new URL(request.url);
    const catalog = searchParams.get("catalog");

    if (!catalog) {
      return ok({ catalogs: [...AVAILABLE_CATALOGS] });
    }

    const module = getCatalogModule(catalog);
    if (!module) {
      return apiError("Catálogo inválido", 400);
    }

    const canView = await hasModulePermission(session.role, module, "view");
    if (!canView) {
      return apiError("Sin permiso para ver este catálogo", 403);
    }

    const data = await fetchCatalogData(catalog);
    return ok(data);
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError(err.message, err.status);
    }
    if (err instanceof CatalogNotFoundError) {
      return apiError(err.message, 400);
    }
    return apiError("Error interno", 500);
  }
}
