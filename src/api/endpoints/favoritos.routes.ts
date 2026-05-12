import { authFetch } from "@/api/authFetch";

export const FAVORITOS_ENDPOINTS = {
  favoritos: "/favoritos",
  favoritoByProdutoId: (produtoId: number | string) => `/favoritos/${produtoId}`,
} as const;

/** GET /v1/favoritos — sessão via cookies (via authFetch + withCredentials). */
export function listFavoritos() {
  return authFetch<unknown>(FAVORITOS_ENDPOINTS.favoritos, { method: "GET" });
}

/** POST /v1/favoritos/{produto_id} */
export function addFavorito(produtoId: number | string) {
  return authFetch<unknown>(FAVORITOS_ENDPOINTS.favoritoByProdutoId(produtoId), {
    method: "POST",
  });
}

/** DELETE /v1/favoritos/{produto_id} */
export function removeFavorito(produtoId: number | string) {
  return authFetch<unknown>(FAVORITOS_ENDPOINTS.favoritoByProdutoId(produtoId), {
    method: "DELETE",
  });
}
