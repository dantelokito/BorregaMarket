import { NextResponse } from "next/server";
import { TOKEN_COOKIE } from "@/lib/auth/types";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

/** Flags ADR-025: HttpOnly, Path=/, SameSite=Lax; Secure solo HTTPS (NODE_ENV=production). */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(TOKEN_COOKIE, token, {
    ...sessionCookieOptions(),
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(TOKEN_COOKIE, "", {
    ...sessionCookieOptions(),
    maxAge: 0,
  });
}
