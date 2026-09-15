import { describe, expect, it } from "vitest";
import { NextResponse } from "next/server";
import { pickActiveProvider } from "@/lib/auth/active-provider";
import {
  sessionCookieOptions,
  setActiveProviderCookie,
  clearActiveProviderCookie,
} from "@/lib/auth/cookie";
import { ACTIVE_PROVIDER_COOKIE } from "@/lib/auth/types";

describe("pickActiveProvider", () => {
  const providers = [{ id: "centro" }, { id: "tec" }];

  it("uses the cookie when it belongs to the user", () => {
    expect(pickActiveProvider(providers, "tec")).toEqual({
      provider: { id: "tec" },
      cookieCorrected: false,
    });
  });

  it("falls back to the first sucursal when cookie is alien", () => {
    expect(pickActiveProvider(providers, "ajeno")).toEqual({
      provider: { id: "centro" },
      cookieCorrected: true,
    });
  });
});

describe("lbm_active_provider cookie ADR-025", () => {
  it("uses the same flags as the JWT cookie", () => {
    const opts = sessionCookieOptions();
    expect(opts.httpOnly).toBe(true);
    expect(opts.path).toBe("/");
    expect(opts.sameSite).toBe("lax");
    const response = NextResponse.json({ ok: true });
    setActiveProviderCookie(response, "p1");
    const cookie = response.cookies.get(ACTIVE_PROVIDER_COOKIE);
    expect(cookie?.value).toBe("p1");
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.path).toBe("/");
    expect(cookie?.sameSite).toBe("lax");
    clearActiveProviderCookie(response);
    expect(response.cookies.get(ACTIVE_PROVIDER_COOKIE)?.value).toBe("");
  });
});
