export const DEV_JWT_FALLBACK = "dev-secret-change-in-production";
export const MIN_JWT_SECRET_LENGTH = 32;

export class JwtSecretError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JwtSecretError";
  }
}

export function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim() ?? "";
  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    if (!secret || secret.length < MIN_JWT_SECRET_LENGTH || secret === DEV_JWT_FALLBACK) {
      throw new JwtSecretError(
        "JWT_SECRET must be a unique secret of at least 32 characters in production"
      );
    }
    return secret;
  }

  return secret || DEV_JWT_FALLBACK;
}
