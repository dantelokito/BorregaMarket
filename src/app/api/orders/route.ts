import { NextRequest } from "next/server";
import { after } from "next/server";
import { UserRole } from "@prisma/client";
import { getSession, requireRole } from "@/lib/auth/session";
import { ok, paginated } from "@/lib/api/response";
import { parsePaginationParams } from "@/lib/services/pagination";
import { sendNewOrderEmail } from "@/lib/email/resend";
import { handleOrderRouteError } from "@/lib/orders/http";
import {
  createMarketplaceOrder,
  listClientOrders,
} from "@/lib/services/order.service";
import {
  createMarketplaceOrderSchema,
  idempotencyHeaderSchema,
  listOrdersQuerySchema,
} from "@/lib/validators/order";

function clientIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    undefined
  );
}

/** Cliente: historial de pedidos propios */
export async function GET(request: NextRequest) {
  try {
    const session = requireRole(getSession(request), UserRole.CLIENT);
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePaginationParams(searchParams, {
      defaultLimit: 20,
      maxLimit: 50,
    });
    const query = listOrdersQuerySchema.parse({
      status: searchParams.get("status") ?? undefined,
    });
    const result = await listClientOrders({
      clientId: session.sub,
      page,
      limit,
      skip,
      status: query.status,
    });
    return paginated(result.data, result.meta);
  } catch (err) {
    return handleOrderRouteError(err);
  }
}

/** Cliente: crear pedido pickup marketplace */
export async function POST(request: NextRequest) {
  try {
    const session = requireRole(getSession(request), UserRole.CLIENT);
    const headers = idempotencyHeaderSchema.parse({
      "Idempotency-Key": request.headers.get("idempotency-key"),
    });
    const body = createMarketplaceOrderSchema.parse(await request.json());
    const result = await createMarketplaceOrder({
      clientId: session.sub,
      clientName: session.name,
      input: body,
      idempotencyKey: headers["Idempotency-Key"],
      ipAddress: clientIp(request),
    });

    if (result.emailJob) {
      const job = result.emailJob;
      after(async () => {
        await sendNewOrderEmail(job);
      });
    }

    return ok(result.order, result.replay ? 200 : 201);
  } catch (err) {
    return handleOrderRouteError(err);
  }
}
