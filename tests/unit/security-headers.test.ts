import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

describe("security headers", () => {
  it("sets clickjacking, MIME, referrer and geolocation policies", async () => {
    const headersFn = nextConfig.headers;
    expect(headersFn).toBeTypeOf("function");
    const result = await headersFn!();
    const headers = Object.fromEntries(
      result[0].headers.map((h) => [h.key, h.value])
    );
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["Permissions-Policy"]).toContain("geolocation=(self)");
    expect(headers["Permissions-Policy"]).toContain("camera=()");
  });

  it("does not list private LAN origins", () => {
    expect(nextConfig.allowedDevOrigins).toEqual(["localhost"]);
  });
});
