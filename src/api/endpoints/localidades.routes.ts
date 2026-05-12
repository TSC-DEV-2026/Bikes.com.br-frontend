// src/api/endpoints/localidades.routes.ts
import { authFetch } from "@/api/authFetch";

export const LOCALIDADES_ENDPOINTS = {
  sugestoesCidades: "/enderecos/sugestoes/cidades",
} as const;

export function listPaises() {
  throw new Error("Backend real não fornece /paises (pendência).");
}

export function listEstadosByPais(paisId: string | number) {
  void paisId;
  throw new Error("Backend real não fornece /estados por país (pendência).");
}

export function listCidadesByEstado(estadoId: string | number) {
  void estadoId;
  throw new Error("Backend real não fornece /cidades por estado (pendência).");
}

/** GET /enderecos/sugestoes/cidades — exige sessão (`q`, `limit` como no Swagger). */
export function listSugestoesCidades(term: string, limit = 10) {
  const t = term.trim();
  return authFetch(LOCALIDADES_ENDPOINTS.sugestoesCidades, {
    method: "GET",
    params: { q: t, limit },
  });
}
