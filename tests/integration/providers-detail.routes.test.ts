import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getProviderDetail = vi.fn();

vi.mock("@/lib/services/provider.service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/provider.service")>(
    "@/lib/services/provider.service"
  );
  return {
    ...actual,
    getProviderDetail: (...args: unknown[]) => getProviderDetail(...args),
  };
});

import { GET } from "@/app/api/providers/[id]/route";

function jsonRequest(url: string) {
  return new NextRequest(new URL(url, "http://localhost:8080"));
}

describe("GET /api/providers/[id] catalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns only sellable products (no isAvailable false)", async () => {
    getProviderDetail.mockResolvedValue({
      id: "p1",
      businessName: "El Paraíso",
      products: [
        {
          providerProductId: "pp1",
          productId: "prod1",
          name: "Mango",
          isAvailable: true,
        },
      ],
    });
    const res = await GET(jsonRequest("/api/providers/p1"), {
      params: Promise.resolve({ id: "p1" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.products.every((p: { isAvailable: boolean }) => p.isAvailable)).toBe(
      true
    );
  });
});
