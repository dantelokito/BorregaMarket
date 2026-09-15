import { NextRequest } from "next/server";
import { applyActiveProviderCookie, requireActiveProvider } from "@/lib/auth/active-provider";
import { ok } from "@/lib/api/response";
import { handleOrderRouteError } from "@/lib/orders/http";
import { createPosSale } from "@/lib/services/pos.service";
import {
  createPosSaleSchema,
  idempotencyHeaderSchema,
} from "@/lib/validators/order";

function clientIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    undefined
  );
}

/** Proveedor: cerrar venta de mostrador */
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireActiveProvider(request);
    const headers = idempotencyHeaderSchema.parse({
      "Idempotency-Key": request.headers.get("idempotency-key"),
    });
    const body = createPosSaleSchema.parse(await request.json());
    const result = await createPosSale({
      userId: ctx.session.sub,
      providerId: ctx.provider.id,
      input: body,
      idempotencyKey: headers["Idempotency-Key"],
      ipAddress: clientIp(request),
    });
    return applyActiveProviderCookie(ok(result.order, result.replay ? 200 : 201), ctx.provider.id);
  } catch (err) {
    return handleOrderRouteError(err);
  }
}
