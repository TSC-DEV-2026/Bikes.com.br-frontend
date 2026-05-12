import axios from "axios";
import { getApiBaseUrl } from "@/lib/env";

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

const rawBaseUrl = getApiBaseUrl();
const baseURL = rawBaseUrl.endsWith("/v1") ? rawBaseUrl : `${rawBaseUrl}/v1`;

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
