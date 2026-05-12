// src/api/endpoints/authFetch.routes.ts
import { authFetch } from "@/api/authFetch";

export const API_ENDPOINTS = {
  auth: {
    refreshToken: "/auth/refresh-token",
  },
} as const;

export async function refreshToken() {
  return authFetch(API_ENDPOINTS.auth.refreshToken, { method: "POST" });
}
