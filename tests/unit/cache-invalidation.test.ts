import { readFileSync } from "fs";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { findMany, redisMock } = vi.hoisted(() => ({
  findMany: vi.fn(),
  redisMock: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    incr: vi.fn(),
  },
}));

vi.mock("@upstash/redis", () => ({
  Redis: vi.fn(function RedisMock() {
    return redisMock;
  }),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    providerProduct: { findMany },
  },
}));

import {
  __resetPublicCacheForTests,
  detailKey,
  LIST_GEN_KEY,
} from "@/lib/cache/public-cache";
import { invalidateProductProviders } from "@/lib/cache/invalidate-product";

const ENV_KEYS = [
  "PUBLIC_CACHE_DISABLED",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
] as const;

function readSrc(rel: string): string {
  return readFileSync(path.join(process.cwd(), rel), "utf8");
}

function methodBody(source: string, method: string): string {
  const marker = `export async function ${method}`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`falta ${method}`);
  const next = source.indexOf("\nexport async function ", start + marker.length);
  return next < 0 ? source.slice(start) : source.slice(start, next);
}

/** Mutaciones que cambian precio, archivo, secciones, ficha pública o reseñas. */
const HOOKS: { file: string; method: string; symbol: string }[] = [
  { file: "src/app/api/providers/route.ts", method: "POST", symbol: "invalidateProviderCache" },
  { file: "src/app/api/provider/me/route.ts", method: "PATCH", symbol: "invalidateProviderCache" },
  { file: "src/app/api/provider/products/route.ts", method: "PATCH", symbol: "invalidateProviderCache" },
  {
    file: "src/app/api/provider/products/by-product/[productId]/route.ts",
    method: "PATCH",
    symbol: "invalidateProviderCache",
  },
  {
    file: "src/app/api/provider/products/by-product/[productId]/price/route.ts",
    method: "PATCH",
    symbol: "invalidateProviderCache",
  },
  {
    file: "src/app/api/provider/products/by-product/[productId]/archive/route.ts",
    method: "POST",
    symbol: "invalidateProviderCache",
  },
  {
    file: "src/app/api/provider/products/by-product/[productId]/restore/route.ts",
    method: "POST",
    symbol: "invalidateProviderCache",
  },
  {
    file: "src/app/api/provider/products/[providerProductId]/image/route.ts",
    method: "POST",
    symbol: "invalidateProviderCache",
  },
  { file: "src/app/api/provider/local-products/route.ts", method: "POST", symbol: "invalidateProviderCache" },
  {
    file: "src/app/api/provider/local-products/[id]/route.ts",
    method: "PATCH",
    symbol: "invalidateProviderCache",
  },
  { file: "src/app/api/provider/sections/route.ts", method: "POST", symbol: "invalidateProviderCache" },
  { file: "src/app/api/provider/sections/[id]/route.ts", method: "PATCH", symbol: "invalidateProviderCache" },
  { file: "src/app/api/provider/sections/[id]/route.ts", method: "DELETE", symbol: "invalidateProviderCache" },
  {
    file: "src/app/api/provider/sections/reorder/route.ts",
    method: "PATCH",
    symbol: "invalidateProviderCache",
  },
  { file: "src/app/api/provider/media/route.ts", method: "POST", symbol: "invalidateProviderCache" },
  { file: "src/app/api/admin/providers/[id]/route.ts", method: "PATCH", symbol: "invalidateProviderCache" },
  { file: "src/app/api/admin/products/[id]/route.ts", method: "PATCH", symbol: "invalidateProductProviders" },
  {
    file: "src/app/api/admin/products/[id]/image/route.ts",
    method: "POST",
    symbol: "invalidateProductProviders",
  },
];

const MUST_NOT = [
  "src/app/api/catalogs/route.ts",
  "src/app/api/provider/active/route.ts",
  "src/app/api/provider/inventory/route.ts",
  "src/app/api/provider/pos/sales/route.ts",
  "src/app/api/orders/route.ts",
  "src/app/api/provider/orders/route.ts",
  "src/app/api/admin/analytics/route.ts",
];

describe("invalidación de la representación pública", () => {
  it.each(HOOKS)("$method $file llama $symbol después de la escritura", ({ file, method, symbol }) => {
    const body = methodBody(readSrc(file), method);
    const at = body.indexOf(`await ${symbol}`);
    expect(at).toBeGreaterThan(0);
    expect(body.slice(0, at)).toMatch(/await /);
  });

  it("no invalida lecturas ni rutas que el contrato excluye", () => {
    expect(methodBody(readSrc("src/app/api/providers/route.ts"), "GET")).not.toContain(
      "invalidateProviderCache"
    );
    expect(methodBody(readSrc("src/app/api/provider/me/route.ts"), "GET")).not.toContain(
      "invalidateProviderCache"
    );
    expect(methodBody(readSrc("src/app/api/provider/sections/route.ts"), "GET")).not.toContain(
      "invalidateProviderCache"
    );
    expect(methodBody(readSrc("src/app/api/provider/products/route.ts"), "GET")).not.toContain(
      "invalidateProviderCache"
    );
    for (const file of MUST_NOT) {
      expect(readSrc(file)).not.toContain("invalidateProviderCache");
      expect(readSrc(file)).not.toContain("invalidateProductProviders");
      expect(readSrc(file)).not.toContain("public-cache");
    }
    expect(readSrc("src/app/api/catalogs/route.ts")).toContain("requireRole");
  });

  it("redondea lat/lng antes de leer la caché y no cachea el 400 del listado", () => {
    const get = methodBody(readSrc("src/app/api/providers/route.ts"), "GET");
    const cacheAt = get.indexOf("cachedProviderList");
    expect(get.indexOf("roundCoord")).toBeGreaterThan(-1);
    expect(get.indexOf("roundCoord")).toBeLessThan(cacheAt);
    expect(get.lastIndexOf("400")).toBeLessThan(cacheAt);
    expect(get).toContain('headers.set("X-Cache"');

    const detail = readSrc("src/app/api/providers/[id]/route.ts");
    expect(detail).toContain("cachedProviderDetail");
    expect(detail).toContain('headers.set("X-Cache"');
    expect(detail).not.toContain("getSession");
  });

  it("crea y borra reseñas invalidando al proveedor después del commit", () => {
    const service = readSrc("src/lib/services/review.service.ts");
    for (const name of ["createReview", "deleteReviewAsAdmin"]) {
      const body = methodBody(service, name);
      const tx = body.indexOf("$transaction");
      const inv = body.indexOf("invalidateProviderCache");
      expect(tx).toBeGreaterThan(-1);
      expect(inv).toBeGreaterThan(tx);
    }
    expect(methodBody(service, "getOrderReview")).not.toContain("invalidateProviderCache");
    expect(methodBody(service, "listProviderReviews")).not.toContain("invalidateProviderCache");
    expect(methodBody(readSrc("src/app/api/orders/[id]/reviews/route.ts"), "POST")).toContain(
      "createReview"
    );
    expect(methodBody(readSrc("src/app/api/admin/reviews/[id]/route.ts"), "DELETE")).toContain(
      "deleteReviewAsAdmin"
    );
  });
});

describe("invalidateProductProviders", () => {
  const saved: Partial<Record<(typeof ENV_KEYS)[number], string>> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
    __resetPublicCacheForTests();
    findMany.mockReset();
    redisMock.del.mockReset();
    redisMock.incr.mockReset();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
    vi.restoreAllMocks();
  });

  it("does not query Prisma when the public cache is off", async () => {
    await invalidateProductProviders("prod-1");
    expect(findMany).not.toHaveBeenCalled();
  });

  it("invalidates every provider that sells the product", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    __resetPublicCacheForTests();
    findMany.mockResolvedValue([{ providerId: "a" }, { providerId: "b" }]);
    redisMock.del.mockResolvedValue(2);
    redisMock.incr.mockResolvedValue(1);
    await invalidateProductProviders("prod-1");
    expect(findMany).toHaveBeenCalledWith({
      where: { productId: "prod-1" },
      select: { providerId: true },
      distinct: ["providerId"],
    });
    expect(redisMock.del).toHaveBeenCalledWith(detailKey("a"), detailKey("b"));
    expect(redisMock.incr).toHaveBeenCalledWith(LIST_GEN_KEY);
  });

  it("swallows a Prisma failure so the catalog write still succeeds", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    __resetPublicCacheForTests();
    findMany.mockRejectedValue(new Error("db down"));
    await expect(invalidateProductProviders("prod-1")).resolves.toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith("[cache] invalidate_failed", "db down");
    expect(redisMock.del).not.toHaveBeenCalled();
  });
});
