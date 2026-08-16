import { describe, expect, it } from "vitest";
import { buildNominatimSearchUrl } from "@/lib/maps/nominatim";
import { MONTERREY_VIEWBOX } from "@/lib/maps/constants";

describe("nominatim search url", () => {
  it("scopes to Mexico and Monterrey viewbox", () => {
    const url = new URL(buildNominatimSearchUrl("San Pedro"));
    expect(url.hostname).toBe("nominatim.openstreetmap.org");
    expect(url.searchParams.get("countrycodes")).toBe("mx");
    expect(url.searchParams.get("viewbox")).toBe(MONTERREY_VIEWBOX);
    expect(url.searchParams.get("bounded")).toBe("1");
    expect(url.searchParams.get("q")).toBe("San Pedro");
  });
});
