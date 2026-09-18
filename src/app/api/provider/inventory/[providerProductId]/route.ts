import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "@/lib/auth/session";
import { applyActiveProviderCookie, requireActiveProvider } from "@/lib/auth/active-provider";
import { apiError, fromZodError, handleRouteError, ok } from "@/lib/api/response";
import { ProviderNotFoundError } from "@/lib/services/provider.service";
import { CatalogForbiddenError } from "@/lib/services/local-product.service";
import {
  getInventoryItem,
  InventoryValidationError,
  patchInventoryItem,
} from "@/lib/services/inventory.service";
import {
  ConfirmDiscardRequiredError,
  EncargarActiveError,
} from "@/lib/catalog/offer";
import { patchInventorySchema } from "@/lib/validators/inventory";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ providerProductId: string }> }
) {
  try {
    const ctx = await requireActiveProvider(request);
    const { providerProductId } = await params;
    const data = await getInventoryItem({
      userId: ctx.session.sub,
      providerId: ctx.provider.id,
      providerProductId,
    });
    return applyActiveProviderCookie(ok(data), ctx.provider.id);
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.message, err.status);
    if (err instanceof ProviderNotFoundError) return apiError(err.message, 404);
    if (err instanceof CatalogForbiddenError) return apiError(err.message, 403);
    return handleRouteError(err);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ providerProductId: string }> }
) {
  try {
    const ctx = await requireActiveProvider(request);
    const { providerProductId } = await params;
    const body = patchInventorySchema.parse(await request.json());
    const data = await patchInventoryItem({
      userId: ctx.session.sub,
      providerId: ctx.provider.id,
      providerProductId,
      input: body,
    });
    return applyActiveProviderCookie(ok(data), ctx.provider.id);
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.message, err.status);
    if (err instanceof ProviderNotFoundError) return apiError(err.message, 404);
    if (err instanceof CatalogForbiddenError) return apiError(err.message, 403);
    if (err instanceof EncargarActiveError) {
      return apiError(err.message, 409, err.details());
    }
    if (err instanceof ConfirmDiscardRequiredError) {
      return apiError(err.message, 400, err.details());
    }
    if (err instanceof InventoryValidationError) {
      return apiError(err.message, 400, err.details);
    }
    if (err instanceof ZodError) {
      return apiError("Datos inválidos", 400, fromZodError(err));
    }
    if (err instanceof SyntaxError) {
      return apiError("Datos inválidos", 400, [
        { field: "body", message: "JSON inválido" },
      ]);
    }
    return handleRouteError(err);
  }
}
