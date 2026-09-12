export const UserRole = {
  CLIENT: "CLIENT",
  PROVIDER: "PROVIDER",
  ADMIN: "ADMIN",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const TOKEN_COOKIE = "lbm_token";
export const ACTIVE_PROVIDER_COOKIE = "lbm_active_provider";

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  name: string;
}

export const USER_ROLES = new Set<string>(Object.values(UserRole));
