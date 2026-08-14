import { NextRequest } from "next/server";
import { SystemModule, AuditAction } from "@prisma/client";
import { getSession } from "@/lib/auth/session";
import { TOKEN_COOKIE } from "@/lib/auth/token";
import { writeAuditLog } from "@/lib/audit";
import { ok } from "@/lib/api/response";

export async function POST(request: NextRequest) {
  const session = getSession(request);

  if (session) {
    await writeAuditLog({
      module: SystemModule.AUTH,
      action: AuditAction.LOGOUT,
      entityId: session.sub,
      userId: session.sub,
    });
  }

  const response = ok({ message: "Sesión cerrada" });
  response.cookies.delete(TOKEN_COOKIE);
  return response;
}
