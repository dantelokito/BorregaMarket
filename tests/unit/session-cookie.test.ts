import { describe, expect, it } from "vitest";
import { NextResponse } from "next/server";
import { TOKEN_COOKIE } from "@/lib/auth/token";
import { clearSessionCookie, sessionCookieOptions, setSessionCookie } from "@/lib/auth/cookie";

describe("session cookie ADR-025", () => {
  it("uses HttpOnly Path=/ SameSite=Lax and Secure only in production", () => {
    const opts = sessionCookieOptions();
    expect(opts.httpOnly).toBe(true);
    expect(opts.path).toBe("/");
    expect(opts.sameSite).toBe("lax");
    expect(opts.secure).toBe(process.env.NODE_ENV === "production");
  });

  it("clears with Max-Age=0 and the same flags", () => {
    const response = NextResponse.json({ ok: true });
    setSessionCookie(response, "token");
    clearSessionCookie(response);
    const cookie = response.cookies.get(TOKEN_COOKIE);
    expect(cookie?.value).toBe("");
    expect(cookie?.path).toBe("/");
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("lax");
  });
});
