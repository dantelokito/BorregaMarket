import { apiGet, apiPost } from "./client";
import type { AuthSession, AuthUser } from "./types";

export const SESSION_THEME_EVENT = "lbm-session-theme";

export function refreshSessionTheme() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SESSION_THEME_EVENT));
}

export async function getAuthSession(): Promise<AuthSession> {
  try {
    const { data } = await apiGet<AuthSession>("/api/auth/session");
    return data;
  } catch {
    return { authenticated: false, role: null, brand: null };
  }
}

export async function login(email: string, password: string) {
  const { data } = await apiPost<{ user: AuthUser }>("/api/auth/login", { email, password });
  refreshSessionTheme();
  return data.user;
}

export async function register(input: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: "CLIENT" | "PROVIDER";
}) {
  const { data } = await apiPost<{ user: AuthUser }>("/api/auth/register", input);
  refreshSessionTheme();
  return data.user;
}

export async function logout() {
  const { data } = await apiPost<{ message: string }>("/api/auth/logout");
  refreshSessionTheme();
  return data.message;
}
