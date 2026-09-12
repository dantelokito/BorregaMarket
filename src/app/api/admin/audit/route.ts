import { NextRequest } from "next/server";
import { SystemModule, AuditAction } from "@prisma/client";
import { AuthError } from "@/lib/auth/session";
import { requireAdminModule } from "@/lib/auth/require-admin-module";
import { paginated, apiError } from "@/lib/api/response";
import { parsePaginationParams } from "@/lib/services/pagination";
import { listAuditLogs } from "@/lib/services/audit.service";

const VALID_MODULES = Object.values(SystemModule);
const VALID_ACTIONS = Object.values(AuditAction);

/** Admin: bitácora de actividad paginada */
export async function GET(request: NextRequest) {
  try {
    await requireAdminModule(request, SystemModule.AUDIT, "view");
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePaginationParams(searchParams, {
      defaultLimit: 20,
      maxLimit: 100,
    });

    const moduleParam = searchParams.get("module");
    const actionParam = searchParams.get("action");
    const userId = searchParams.get("userId");

    const systemModule =
      moduleParam && VALID_MODULES.includes(moduleParam as SystemModule)
        ? (moduleParam as SystemModule)
        : undefined;
    const action =
      actionParam && VALID_ACTIONS.includes(actionParam as AuditAction)
        ? (actionParam as AuditAction)
        : undefined;

    const result = await listAuditLogs(
      { module: systemModule, action, userId: userId ?? undefined },
      { page, limit, skip }
    );

    return paginated(result.data, result.meta);
  } catch (err) {
    if (err instanceof AuthError) {
      return apiError(err.message, err.status);
    }
    return apiError("Error interno", 500);
  }
}
