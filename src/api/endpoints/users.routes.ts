// src/api/endpoints/users.routes.ts
import api from "@/api/axiosInstance";
import { authFetch } from "@/api/authFetch";
import type { RegisterPayload } from "@/api/endpoints/auth.routes";

export const USERS_ENDPOINTS = {
  me: "/auth/me",

  enderecos: "/enderecos",
  enderecoById: (id: number | string) => `/enderecos/${id}`,
  sugestoesCidades: "/enderecos/sugestoes/cidades",

  register: "/auth/register",
} as const;

// Re-export do contrato de cadastro (rota canônica em `auth.routes`).
export type { RegisterPayload };

export function me() {
  return authFetch(USERS_ENDPOINTS.me, { method: "GET" });
}

export type UpdateProfilePayload = {
  pessoa: {
    nome_completo: string;
    email: string;
    telefone_celular: string;
  };
  usuario: {
    email: string;
    senha?: string;
  };
};

export function updateProfile(payload: UpdateProfilePayload) {
  void payload;
  throw new Error(
    "Endpoint de atualização de perfil não existe no backend real (pendência)."
  );
}

export function listEnderecos() {
  return authFetch(USERS_ENDPOINTS.enderecos, { method: "GET" });
}

/** Alinhado a `EnderecoCreate` no backend (campos texto explícitos). */
export type CreateEnderecoPayload = {
  nome_destinatario: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  pais: string;
  referencia: string;
  principal: boolean;
};

export function createEndereco(payload: CreateEnderecoPayload) {
  return authFetch(USERS_ENDPOINTS.enderecos, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    data: {
      nome_destinatario: payload.nome_destinatario,
      cep: payload.cep,
      logradouro: payload.logradouro,
      numero: payload.numero,
      complemento: payload.complemento,
      bairro: payload.bairro,
      cidade: payload.cidade,
      estado: payload.estado,
      pais: payload.pais || "Brasil",
      referencia: payload.referencia,
      principal: payload.principal,
    },
  });
}

export function setEnderecoPrimary(id: number | string) {
  return authFetch(USERS_ENDPOINTS.enderecoById(id), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    data: { principal: true },
  });
}

export function deleteEndereco(id: number | string) {
  return authFetch(USERS_ENDPOINTS.enderecoById(id), { method: "DELETE" });
}

export function getEnderecoById(id: number | string) {
  return authFetch(USERS_ENDPOINTS.enderecoById(id), { method: "GET" });
}

/** Alinhado a `EnderecoUpdate` — campos opcionais; enviar só o que mudar. */
export type UpdateEnderecoPayload = {
  id: number;
  nome_destinatario?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string | null;
  bairro?: string;
  cidade?: string;
  estado?: string;
  pais?: string;
  referencia?: string | null;
  principal?: boolean | null;
  ativo?: boolean | null;
};

export function updateEndereco(payload: UpdateEnderecoPayload) {
  const { id, ...data } = payload;
  return authFetch(USERS_ENDPOINTS.enderecoById(id), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    data,
  });
}

/** GET .../enderecos/sugestoes/cidades — Swagger: `q` (obrigatório), `limit`. */
export function listSugestoesCidades(term: string, limit = 10) {
  const t = term.trim();
  return authFetch(USERS_ENDPOINTS.sugestoesCidades, {
    method: "GET",
    params: { q: t, limit },
  });
}

export function register(payload: RegisterPayload) {
  return api.post(USERS_ENDPOINTS.register, payload);
}
