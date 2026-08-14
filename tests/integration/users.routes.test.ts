import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";

const getSession = vi.fn();
const getClientProfile = vi.fn();
const updateClientProfile = vi.fn();

vi.mock("@/lib/auth/session", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/session")>(
    "@/lib/auth/session"
  );
  return {
    ...actual,
    getSession: (...args: unknown[]) => getSession(...args),
  };
});

vi.mock("@/lib/services/user.service", () => ({
  getClientProfile: (...args: unknown[]) => getClientProfile(...args),
  updateClientProfile: (...args: unknown[]) => updateClientProfile(...args),
}));

import { GET, PATCH } from "@/app/api/users/me/route";

function jsonRequest(
  url: string,
  options: { method?: string; body?: unknown } = {}
) {
  return new NextRequest(new URL(url, "http://localhost:8080"), {
    method: options.method ?? "GET",
    headers: { "content-type": "application/json" },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

describe("users me whatsappOptIn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSession.mockReturnValue({
      sub: "u1",
      email: "c@test.com",
      role: UserRole.CLIENT,
      name: "María",
    });
  });

  it("GET includes whatsappOptIn", async () => {
    getClientProfile.mockResolvedValue({
      id: "u1",
      name: "María",
      email: "c@test.com",
      phone: "+528110000003",
      role: "CLIENT",
      whatsappOptIn: false,
    });
    const res = await GET(jsonRequest("/api/users/me"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.whatsappOptIn).toBe(false);
  });

  it("PATCH accepts whatsappOptIn true", async () => {
    updateClientProfile.mockResolvedValue({
      id: "u1",
      name: "María",
      email: "c@test.com",
      phone: "+528110000003",
      role: "CLIENT",
      whatsappOptIn: true,
    });
    const res = await PATCH(
      jsonRequest("/api/users/me", {
        method: "PATCH",
        body: { whatsappOptIn: true },
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.whatsappOptIn).toBe(true);
  });
});
