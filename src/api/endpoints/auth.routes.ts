// src/api/endpoints/auth.routes.ts
import api from "@/api/axiosInstance";

export const AUTH_ENDPOINTS = {
  register: "/auth/register",
  login: "/auth/login",
  me: "/auth/me",
  logout: "/auth/logout",
  refresh: "/auth/refresh-token",

  /** Não existe no backend atual — mantido para chamadas legadas; espera-se 404. */
  requestPasswordReset: "/auth/request-password-reset",

  /** Não existe no backend atual — mantido para chamadas legadas; espera-se 404. */
  resetPassword: "/auth/reset-password",
} as const;

export type LoginPayload = {
  email: string;
  senha: string;
};

/** Contrato real: `POST /auth/register` (usuário retornado + cookies quando aplicável). */
export type RegisterPayload = {
  email: string;
  senha: string;
  pessoa: {
    nome_completo: string;
    cpf: string;
    telefone?: string | null;
  };
};

export async function register(payload: RegisterPayload) {
  return api.post(AUTH_ENDPOINTS.register, payload);
}

/**
 * Login: backend define tokens apenas em cookies HttpOnly; o body é `UsuarioRead`.
 */
export async function login(payload: LoginPayload) {
  return api.post<unknown>(AUTH_ENDPOINTS.login, payload);
}

export async function me() {
  return api.get(AUTH_ENDPOINTS.me);
}

/** Logout: backend lê cookies da requisição e limpa HttpOnly no response. */
export async function logout() {
  return api.post(AUTH_ENDPOINTS.logout);
}

/** Refresh: sem body; cookie `refresh_token` é enviado automaticamente (`withCredentials`). */
export async function refresh() {
  return api.post(AUTH_ENDPOINTS.refresh);
}

export type RequestPasswordResetPayload = {
  email: string;
};

export async function requestPasswordReset(payload: RequestPasswordResetPayload) {
  return api.post(AUTH_ENDPOINTS.requestPasswordReset, payload);
}

export type ResetPasswordPayload = {
  token: string;
  nova_senha: string;
};

export async function resetPassword(payload: ResetPasswordPayload) {
  return api.post(AUTH_ENDPOINTS.resetPassword, payload);
}
