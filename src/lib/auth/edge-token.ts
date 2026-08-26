import { jwtVerify } from "jose";
import { resolveJwtSecret } from "./jwt-secret";
import { TOKEN_COOKIE, USER_ROLES, UserRole, type JwtPayload } from "./types";

export { TOKEN_COOKIE };

/** Edge-safe JWT verify (firma HS256). Nunca decodificar el payload sin verificar. */
export async function verifyToken(token: string): Promise<JwtPayload | null> {
  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(resolveJwtSecret());
    const { payload } = await jwtVerify(token, secret);
    const sub = typeof payload.sub === "string" ? payload.sub : "";
    const email = typeof payload.email === "string" ? payload.email : "";
    const role = typeof payload.role === "string" ? payload.role : "";
    const name = typeof payload.name === "string" ? payload.name : "";

    if (!sub || !email || !name || !USER_ROLES.has(role)) return null;

    return { sub, email, role: role as UserRole, name };
  } catch {
    return null;
  }
}
