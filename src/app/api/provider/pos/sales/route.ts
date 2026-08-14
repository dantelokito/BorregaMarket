import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { getSession, requireRole } from "@/lib/auth/session";
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
    const session = requireRole(getSession(request), UserRole.PROVIDER);
    const headers = idempotencyHeaderSchema.parse({
      "Idempotency-Key": request.headers.get("idempotency-key"),
    });
    const body = createPosSaleSchema.parse(await request.json());
    const result = await createPosSale({
      userId: session.sub,
      input: body,
      idempotencyKey: headers["Idempotency-Key"],
      ipAddress: clientIp(request),
    });
    return ok(result.order, result.replay ? 200 : 201);
  } catch (err) {
    return handleOrderRouteError(err);
  }
}
