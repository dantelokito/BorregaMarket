import type { JwtPayload } from "./token";

export const TOKEN_COOKIE = "lbm_token";

export function verifyToken(token: string): JwtPayload | null {
  if (!token) return null;

  const segments = token.split(".");
  if (segments.length !== 3) return null;

  try {
    const base64Payload = segments[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(segments[1].length / 4) * 4, "=");

    const binary = globalThis.atob(base64Payload);
    const json = decodeURIComponent(
      binary
        .split("")
        .map((char) => "%" + char.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );

    const payload = JSON.parse(json) as JwtPayload & { exp?: number };
    if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) {
      return null;
    }

    return payload as JwtPayload;
  } catch {
    return null;
  }
}
