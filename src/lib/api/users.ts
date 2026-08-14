import { apiGet, apiPatch } from "./client";
import type { UserProfile } from "./types";

export async function getMyProfile() {
  return apiGet<UserProfile>("/api/users/me");
}

export async function updateMyProfile(input: { name?: string; phone?: string | null }) {
  return apiPatch<UserProfile>("/api/users/me", input);
}
