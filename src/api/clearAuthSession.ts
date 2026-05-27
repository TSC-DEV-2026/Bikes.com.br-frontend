/** Chaves de token em localStorage/sessionStorage (legadas e comuns). Cookies HttpOnly não são afetados. */
const PERSISTED_AUTH_TOKEN_KEYS = [
  "refresh_token",
  "access_token",
  "token",
  "auth_token",
  "auth.access_token.v1",
  "auth.refresh_token.v1",
  "auth.token_type.v1",
] as const;

/** Remove tokens persistidos no browser. Idempotente; não altera cookies HttpOnly. */
export function clearAuthSession(): void {
  if (typeof window === "undefined") return;
  for (const key of PERSISTED_AUTH_TOKEN_KEYS) {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}
