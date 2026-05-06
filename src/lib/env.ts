/** Base URL da API (sem barra final). Default preserva o comportamento anterior em dev. */
export function getApiBaseUrl(): string {
  const url = import.meta.env.VITE_API_URL?.trim();
  if (url) return url.replace(/\/$/, "");
  return "http://localhost:8000";
}
