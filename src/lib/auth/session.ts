import { NextRequest } from "next/server";
import { UserRole } from "@/lib/auth/token";
import { JwtPayload } from "./token";
import { verifyToken, TOKEN_COOKIE } from "./edge-token";

export function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return request.cookies.get(TOKEN_COOKIE)?.value ?? null;
}

export function getSession(request: NextRequest): JwtPayload | null {
  const token = extractToken(request);
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

export function requireRole(session: JwtPayload | null, ...roles: UserRole[]): JwtPayload {
  if (!session) throw new AuthError("No autenticado", 401);
  if (!roles.includes(session.role)) throw new AuthError("Acceso denegado", 403);
  return session;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "AuthError";
  }
}
