import jwt from "jsonwebtoken";
import { resolveJwtSecret } from "./jwt-secret";
import { USER_ROLES, type JwtPayload, type UserRole } from "./types";

export {
  TOKEN_COOKIE,
  ACTIVE_PROVIDER_COOKIE,
  UserRole,
  type JwtPayload,
} from "./types";
export {
  DEV_JWT_FALLBACK,
  MIN_JWT_SECRET_LENGTH,
  JwtSecretError,
  resolveJwtSecret,
} from "./jwt-secret";

function toJwtPayload(decoded: string | jwt.JwtPayload): JwtPayload {
  if (typeof decoded !== "object" || decoded === null) {
    throw new Error("Invalid token payload");
  }

  const sub = typeof decoded.sub === "string" ? decoded.sub : "";
  const email = typeof decoded.email === "string" ? decoded.email : "";
  const role = typeof decoded.role === "string" ? decoded.role : "";
  const name = typeof decoded.name === "string" ? decoded.name : "";

  if (!sub || !email || !name || !USER_ROLES.has(role)) {
    throw new Error("Invalid token payload");
  }

  return { sub, email, role: role as UserRole, name };
}

export function signToken(payload: JwtPayload): string {
  const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "7d";
  return jwt.sign(payload, resolveJwtSecret(), {
    expiresIn: JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function verifyToken(token: string): JwtPayload {
  return toJwtPayload(jwt.verify(token, resolveJwtSecret()));
}
