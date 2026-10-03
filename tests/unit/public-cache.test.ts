import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { redisMock } = vi.hoisted(() => ({
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

import { Redis } from "@upstash/redis";
import {
  CACHE_TIMEOUT_MS,
  DETAIL_TTL_SECONDS,
  LIST_GEN_KEY,
  LIST_TTL_SECONDS,
  __resetPublicCacheForTests,
  cachedProviderDetail,
  cachedProviderList,
  detailKey,
  invalidateProviderCache,
  isPublicCacheEnabled,
  listKey,
  normalizeProviderListQuery,
  roundCoord,
} from "@/lib/cache/public-cache";

const ENV_KEYS = [
  "PUBLIC_CACHE_DISABLED",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
] as const;

function enableCache() {
  process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
  process.env.UPSTASH_REDIS_REST_TOKEN = "token";
  delete process.env.PUBLIC_CACHE_DISABLED;
  __resetPublicCacheForTests();
}

describe("public cache-aside (ADR-043)", () => {
  const saved: Partial<Record<(typeof ENV_KEYS)[number], string>> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
    __resetPublicCacheForTests();
    redisMock.get.mockReset();
    redisMock.set.mockReset();
    redisMock.del.mockReset();
    redisMock.incr.mockReset();
    vi.mocked(Redis).mockClear();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("bypasses when Upstash is not configured and does not keep a memory fallback", async () => {
    const loader = vi.fn(async () => ({ fresh: true }));
    const result = await cachedProviderDetail("p1", loader);
    expect(result).toEqual({ body: { fresh: true }, status: "BYPASS" });
    expect(isPublicCacheEnabled()).toBe(false);
    expect(Redis).not.toHaveBeenCalled();
    expect(loader).toHaveBeenCalledOnce();
  });

  it("bypasses when PUBLIC_CACHE_DISABLED=1 even if Upstash keys exist", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    process.env.PUBLIC_CACHE_DISABLED = "1";
    __resetPublicCacheForTests();
    const loader = vi.fn(async () => ({ fresh: true }));
    const result = await cachedProviderList("page=1", loader);
    expect(result.status).toBe("BYPASS");
    expect(redisMock.get).not.toHaveBeenCalled();
    expect(redisMock.set).not.toHaveBeenCalled();
  });

  it("returns HIT without calling the loader and MISS stores JSON with the detail TTL", async () => {
    enableCache();
    redisMock.get.mockResolvedValueOnce(JSON.stringify({ id: "p1", price: 10 }));
    const hitLoader = vi.fn(async () => ({ id: "p1", price: 99 }));
    await expect(cachedProviderDetail("p1", hitLoader)).resolves.toEqual({
      body: { id: "p1", price: 10 },
      status: "HIT",
    });
    expect(hitLoader).not.toHaveBeenCalled();
    expect(redisMock.get).toHaveBeenCalledWith(detailKey("p1"));

    redisMock.get.mockResolvedValueOnce(null);
    redisMock.set.mockResolvedValueOnce("OK");
    const missLoader = vi.fn(async () => ({ id: "p1", price: 12 }));
    await expect(cachedProviderDetail("p1", missLoader)).resolves.toEqual({
      body: { id: "p1", price: 12 },
      status: "MISS",
    });
    expect(redisMock.set).toHaveBeenCalledWith(
      "lbm:c1:pd:p1",
      JSON.stringify({ id: "p1", price: 12 }),
      { ex: DETAIL_TTL_SECONDS }
    );
    expect(DETAIL_TTL_SECONDS).toBe(60);
  });

  it("keys listings by generation and sha1, with a 30s TTL", async () => {
    enableCache();
    const query = "limit=20&page=1";
    redisMock.get.mockImplementation(async (key: string) => {
      if (key === LIST_GEN_KEY) return "4";
      return null;
    });
    redisMock.set.mockResolvedValue("OK");
    const loader = vi.fn(async () => ({ data: [1] }));
    await expect(cachedProviderList(query, loader)).resolves.toEqual({
      body: { data: [1] },
      status: "MISS",
    });
    const key = listKey(4, query);
    expect(key).toMatch(/^lbm:c1:pl:4:[a-f0-9]{40}$/);
    expect(redisMock.set).toHaveBeenCalledWith(key, JSON.stringify({ data: [1] }), {
      ex: LIST_TTL_SECONDS,
    });
    expect(LIST_TTL_SECONDS).toBe(30);

    redisMock.set.mockClear();
    redisMock.get.mockImplementation(async (k: string) => {
      if (k === LIST_GEN_KEY) return "4";
      if (k === key) return JSON.stringify({ data: [1] });
      return null;
    });
    const hitLoader = vi.fn();
    await expect(cachedProviderList(query, hitLoader)).resolves.toEqual({
      body: { data: [1] },
      status: "HIT",
    });
    expect(hitLoader).not.toHaveBeenCalled();
  });

  it("does not cache a thrown loader (400/404/500 stay out of Redis)", async () => {
    enableCache();
    redisMock.get.mockResolvedValue(null);
    await expect(
      cachedProviderDetail("missing", async () => {
        throw new Error("not_found");
      })
    ).rejects.toThrow("not_found");
    expect(redisMock.set).not.toHaveBeenCalled();
  });

  it("overwrites a corrupt value and fails open when Redis read or write errors", async () => {
    enableCache();
    redisMock.get.mockResolvedValueOnce("{");
    redisMock.set.mockResolvedValueOnce("OK");
    await expect(cachedProviderDetail("p1", async () => ({ ok: 1 }))).resolves.toEqual({
      body: { ok: 1 },
      status: "MISS",
    });

    redisMock.get.mockRejectedValueOnce(new Error("read down"));
    await expect(cachedProviderDetail("p1", async () => ({ ok: 2 }))).resolves.toEqual({
      body: { ok: 2 },
      status: "BYPASS",
    });
    expect(console.warn).toHaveBeenCalledWith("[cache] read_failed", "read down");

    redisMock.get.mockRejectedValueOnce(new Error("read down again"));
    await cachedProviderDetail("p1", async () => ({ ok: 3 }));
    expect(console.warn).toHaveBeenCalledTimes(1);

    __resetPublicCacheForTests();
    redisMock.get.mockResolvedValueOnce(null);
    redisMock.set.mockRejectedValueOnce(new Error("write down"));
    await expect(cachedProviderDetail("p1", async () => ({ ok: 4 }))).resolves.toEqual({
      body: { ok: 4 },
      status: "MISS",
    });
    expect(console.warn).toHaveBeenCalledWith("[cache] write_failed", "write down");
  });

  it("fails open on a Redis timeout longer than 300ms", async () => {
    vi.useFakeTimers();
    enableCache();
    redisMock.get.mockImplementation(() => new Promise(() => {}));
    const loader = vi.fn(async () => ({ fromDb: true }));
    const pending = cachedProviderDetail("p1", loader);
    await vi.advanceTimersByTimeAsync(CACHE_TIMEOUT_MS);
    await expect(pending).resolves.toEqual({ body: { fromDb: true }, status: "BYPASS" });
    expect(loader).toHaveBeenCalledOnce();
    expect(redisMock.set).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith("[cache] read_failed", "redis_timeout");
  });

  it("treats a missing list generation as 0 and bypasses when that read fails", async () => {
    enableCache();
    redisMock.get.mockImplementation(async (key: string) => (key === LIST_GEN_KEY ? null : null));
    redisMock.set.mockResolvedValue("OK");
    await cachedProviderList("page=1", async () => ({ data: [] }));
    expect(redisMock.set.mock.calls[0]?.[0]).toBe(listKey(0, "page=1"));

    redisMock.set.mockClear();
    redisMock.get.mockRejectedValue(new Error("gen down"));
    await expect(cachedProviderList("page=1", async () => ({ data: ["db"] }))).resolves.toEqual({
      body: { data: ["db"] },
      status: "BYPASS",
    });
    expect(redisMock.set).not.toHaveBeenCalled();
  });

  it("invalidates detail keys and bumps the list generation without failing the write", async () => {
    enableCache();
    redisMock.del.mockResolvedValue(2);
    redisMock.incr.mockResolvedValue(8);
    await invalidateProviderCache(["prov-a", "prov-a", "", "prov-b"]);
    expect(redisMock.del).toHaveBeenCalledWith(detailKey("prov-a"), detailKey("prov-b"));
    expect(redisMock.incr).toHaveBeenCalledWith(LIST_GEN_KEY);

    redisMock.del.mockClear();
    await invalidateProviderCache([]);
    expect(redisMock.del).not.toHaveBeenCalled();
    expect(redisMock.incr).toHaveBeenCalledTimes(2);

    redisMock.del.mockRejectedValue(new Error("del down"));
    await expect(invalidateProviderCache(["prov-a"])).resolves.toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith("[cache] invalidate_failed", "del down");
  });

  it("skips invalidation when the cache is disabled", async () => {
    await invalidateProviderCache(["prov-a"]);
    expect(redisMock.del).not.toHaveBeenCalled();
    expect(redisMock.incr).not.toHaveBeenCalled();
  });

  it("builds a stable query key and rounds coordinates to 3 decimals before use", () => {
    expect(roundCoord(25.1236)).toBe(25.124);
    expect(roundCoord(-100.3164)).toBe(-100.316);
    expect(roundCoord(25.1234)).toBe(25.123);

    const key = normalizeProviderListQuery({
      page: 2,
      limit: 20,
      q: "  Manzana ",
      city: "Monterrey",
      category: "FRUTA",
      verified: true,
      offersWholesale: true,
      offersDelivery: false,
      geo: { lat: roundCoord(25.1236), lng: roundCoord(-100.3164), radiusKm: 5 },
    });
    expect(key).toBe(
      "category=FRUTA&city=monterrey&lat=25.124&limit=20&lng=-100.316&offersWholesale=true&page=2&q=manzana&radiusKm=5&verified=true"
    );
    expect(
      normalizeProviderListQuery({
        page: 1,
        limit: 20,
        q: " ",
        verified: false,
        geo: null,
      })
    ).toBe("limit=20&page=1");
  });

  it("constructs Redis without retries and without automatic deserialization", async () => {
    enableCache();
    redisMock.get.mockResolvedValue(null);
    redisMock.set.mockResolvedValue("OK");
    await cachedProviderDetail("p1", async () => ({ ok: true }));
    expect(Redis).toHaveBeenCalledWith({
      url: "https://example.upstash.io",
      token: "token",
      retry: false,
      automaticDeserialization: false,
    });
  });
});
