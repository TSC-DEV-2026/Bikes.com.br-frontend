import { authFetch } from "@/api/authFetch";
import type {
  CreateVendedorPayload,
  UpdateVendedorPayload,
  Vendedor,
} from "@/types/vendedor";

export const VENDEDORES_ENDPOINTS = {
  me: "/vendedores/me",
  root: "/vendedores",
} as const;

/** GET /v1/vendedores/me — 200 se existe; 404 se ainda não há conta (sem lançar). */
export function getMeuVendedor() {
  return authFetch<Vendedor>(VENDEDORES_ENDPOINTS.me, {
    method: "GET",
    validateStatus: (status) => status === 200 || status === 404,
  });
}

/** POST /v1/vendedores */
export function createVendedor(payload: CreateVendedorPayload) {
  return authFetch<Vendedor>(VENDEDORES_ENDPOINTS.root, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    data: payload,
  });
}

/** PUT /v1/vendedores/me */
export function updateMeuVendedor(payload: UpdateVendedorPayload) {
  return authFetch<Vendedor>(VENDEDORES_ENDPOINTS.me, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    data: payload,
  });
}
