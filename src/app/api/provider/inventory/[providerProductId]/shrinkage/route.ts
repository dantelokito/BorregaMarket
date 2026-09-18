import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "@/lib/auth/session";
import { applyActiveProviderCookie, requireActiveProvider } from "@/lib/auth/active-provider";
import { apiCodedError, apiError, fromZodError, handleRouteError, ok } from "@/lib/api/response";
import { ProviderNotFoundError } from "@/lib/services/provider.service";
import { CatalogForbiddenError } from "@/lib/services/local-product.service";
import {
  addShrinkage,
  InventoryNegativeError,
  InventoryValidationError,
} from "@/lib/services/inventory.service";
import { OfferArchivedError } from "@/lib/catalog/offer";
import { shrinkageSchema } from "@/lib/validators/inventory";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ providerProductId: string }> }
) {
  try {
    const ctx = await requireActiveProvider(request);
    const { providerProductId } = await params;
    const body = shrinkageSchema.parse(await request.json());
    const data = await addShrinkage({
      userId: ctx.session.sub,
      providerId: ctx.provider.id,
      providerProductId,
      input: body,
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
    });
    return applyActiveProviderCookie(ok(data, 201), ctx.provider.id);
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.message, err.status);
    if (err instanceof ProviderNotFoundError) return apiError(err.message, 404);
    if (err instanceof CatalogForbiddenError) return apiError(err.message, 403);
    if (err instanceof OfferArchivedError) {
      return apiError(err.message, 409, err.details());
    }
    if (err instanceof InventoryNegativeError) {
      return apiCodedError(err.code, err.message, 400, err.details);
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
