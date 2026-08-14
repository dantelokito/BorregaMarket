import { NextRequest } from "next/server";
import { after } from "next/server";
import { UserRole } from "@prisma/client";
import { getSession } from "@/lib/auth/session";
import { ok, apiError, handleRouteError } from "@/lib/api/response";
import { contactBodySchema } from "@/lib/validators/contact";
import {
  registerContact,
  runContactEmailJob,
  ContactRateLimitError,
} from "@/lib/services/contact.service";
import { ProviderNotFoundError } from "@/lib/services/provider.service";

/** Público: registrar contacto a frutería + email async al dueño */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = getSession(request);

    let raw: unknown = {};
    const text = await request.text();
    if (text.trim()) {
      raw = JSON.parse(text);
    }
    const body = contactBodySchema.parse(raw ?? {});

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      undefined;

    const clientUserId =
      session?.role === UserRole.CLIENT ? session.sub : undefined;

    const result = await registerContact(id, body, {
      ipAddress: ip,
      userId: clientUserId,
      sessionId: session?.sub ?? null,
    });

    if (result.emailJob) {
      const job = result.emailJob;
      after(async () => {
        await runContactEmailJob(job);
      });
    }

    return ok({
      notified: result.notified,
      message: result.message,
    });
  } catch (err) {
    if (err instanceof ContactRateLimitError) {
      return apiError(err.message, 429);
    }
    if (err instanceof ProviderNotFoundError) {
      return apiError(err.message, 404);
    }
    if (err instanceof SyntaxError) {
      return apiError("Validation failed", 400, [
        { field: "body", message: "JSON inválido" },
      ]);
    }
    return handleRouteError(err);
  }
}
