import { apiPost } from "./client";
import type { AuthUser } from "./types";

export async function login(email: string, password: string) {
  const { data } = await apiPost<{ user: AuthUser }>("/api/auth/login", { email, password });
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
  return data.user;
}

export async function logout() {
  const { data } = await apiPost<{ message: string }>("/api/auth/logout");
  return data.message;
}
