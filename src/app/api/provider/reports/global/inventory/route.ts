import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { getSession, requireRole } from "@/lib/auth/session";
import { ok } from "@/lib/api/response";
import { handleOrderRouteError } from "@/lib/orders/http";
import { getGlobalInventoryReport } from "@/lib/services/inventory-report.service";

export async function GET(request: NextRequest) {
  try {
    const session = requireRole(getSession(request), UserRole.PROVIDER);
    const data = await getGlobalInventoryReport({ userId: session.sub });
    return ok(data);
  } catch (err) {
    return handleOrderRouteError(err);
  }
}
