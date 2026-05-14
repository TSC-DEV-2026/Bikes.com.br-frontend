// src/api/endpoints/authFetch.routes.ts
import { authFetch } from "@/api/authFetch";
import { AUTH_REFRESH_RELATIVE_PATH } from "@/api/axiosInstance";

export const API_ENDPOINTS = {
  auth: {
    refreshToken: AUTH_REFRESH_RELATIVE_PATH,
  },
} as const;

export async function refreshToken() {
  return authFetch(API_ENDPOINTS.auth.refreshToken, { method: "POST" });
}
