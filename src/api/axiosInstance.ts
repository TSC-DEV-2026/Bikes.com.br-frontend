import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { getApiBaseUrl } from "@/lib/env";
import { notifyAuthSessionInvalid } from "@/api/sessionInvalidBridge";

/** Chaves legadas (fluxo Bearer/localStorage) — removidas na carga para não vazar estado antigo. */
const LEGACY_TOKEN_KEYS = [
  "auth.access_token.v1",
  "auth.refresh_token.v1",
  "auth.token_type.v1",
] as const;

function clearLegacyTokenKeys() {
  if (typeof window === "undefined") return;
  for (const key of LEGACY_TOKEN_KEYS) {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}

clearLegacyTokenKeys();

/** Contrato documentado: `POST {baseURL}/auth/refresh-token` (cookies HttpOnly). */
export const AUTH_REFRESH_RELATIVE_PATH = "/auth/refresh-token";

const rawBaseUrl = getApiBaseUrl();
const baseURL = rawBaseUrl.endsWith("/v1") ? rawBaseUrl : `${rawBaseUrl}/v1`;

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

let refreshInFlight: Promise<boolean> | null = null;

function requestPath(cfg: InternalAxiosRequestConfig): string {
  const raw = cfg.url ?? "";
  if (!raw) return "";
  if (raw.startsWith("http")) {
    try {
      return new URL(raw).pathname;
    } catch {
      return raw.split("?")[0] ?? raw;
    }
  }
  const pathOnly = raw.split("?")[0] ?? raw;
  return pathOnly.startsWith("/") ? pathOnly : `/${pathOnly}`;
}

function shouldSkipAuthRefresh(cfg: InternalAxiosRequestConfig): boolean {
  const path = requestPath(cfg);
  if (path === AUTH_REFRESH_RELATIVE_PATH) return true;
  if (path.startsWith("/auth/login")) return true;
  if (path.startsWith("/auth/register")) return true;
  if (path.startsWith("/auth/logout")) return true;
  return false;
}

async function tryRefreshSessionOnce(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const res = await api.post(AUTH_REFRESH_RELATIVE_PATH);
      return res.status >= 200 && res.status < 300;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const original = error.config;
    if (!original) return Promise.reject(error);
    if (status !== 401) return Promise.reject(error);
    if (original._authRefreshRetried) return Promise.reject(error);
    if (shouldSkipAuthRefresh(original)) return Promise.reject(error);

    original._authRefreshRetried = true;
    const ok = await tryRefreshSessionOnce();
    if (!ok) {
      notifyAuthSessionInvalid();
      return Promise.reject(error);
    }
    return api.request(original);
  }
);

export default api;
