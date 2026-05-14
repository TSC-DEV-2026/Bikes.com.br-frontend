import { authFetch } from "@/api/authFetch";
import type { AddCartItemPayload, UpdateCartItemPayload } from "@/types/carrinho";

export const CARRINHO_ENDPOINTS = {
  carrinho: "/carrinho",
  itens: "/carrinho/itens",
} as const;

function itemPath(itemId: string | number): string {
  const seg = encodeURIComponent(String(itemId));
  return `${CARRINHO_ENDPOINTS.itens}/${seg}`;
}

/** GET /v1/carrinho — sessão via cookies (authFetch + withCredentials). */
export function getCarrinho() {
  return authFetch<unknown>(CARRINHO_ENDPOINTS.carrinho, { method: "GET" });
}

/** POST /v1/carrinho/itens */
export function postCarrinhoItem(payload: AddCartItemPayload) {
  return authFetch<unknown>(CARRINHO_ENDPOINTS.itens, {
    method: "POST",
    data: payload,
  });
}

/** PUT /v1/carrinho/itens/{item_id} */
export function putCarrinhoItemById(
  itemId: string | number,
  payload: UpdateCartItemPayload,
) {
  return authFetch<unknown>(itemPath(itemId), {
    method: "PUT",
    data: payload,
  });
}

/** DELETE /v1/carrinho/itens/{item_id} */
export function deleteCarrinhoItemById(itemId: string | number) {
  return authFetch<unknown>(itemPath(itemId), { method: "DELETE" });
}
