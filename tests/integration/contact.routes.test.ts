import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const registerContact = vi.fn();

vi.mock("@/lib/services/contact.service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/contact.service")>(
    "@/lib/services/contact.service"
  );
  return {
    ...actual,
    registerContact: (...args: unknown[]) => registerContact(...args),
  };
});

vi.mock("next/server", async () => {
  const actual = await vi.importActual<typeof import("next/server")>("next/server");
  return {
    ...actual,
    after: vi.fn(() => {
      throw new Error("after() must not be used after ADR-015");
    }),
  };
});

import { POST } from "@/app/api/providers/[id]/contact/route";

function jsonRequest(url: string, body?: unknown) {
  return new NextRequest(new URL(url, "http://localhost:8080"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe("contact route ADR-015", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 without calling after()", async () => {
    registerContact.mockResolvedValue({
      notified: true,
      message: "Frutería notificada",
    });
    const res = await POST(jsonRequest("/api/providers/p1/contact", { source: "call_button" }), {
      params: Promise.resolve({ id: "p1" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.notified).toBe(true);
  });
});
