// src/api/endpoints/paths.ts
/**
 * Rotas da SPA. Nota: `/` é a landing pública; `/home` é a home logada (vitrine + busca).
 * `/produtos` permanece como listagem pública legada, em paralelo, até unificar a UX.
 */
export const paths = {
  login: () => "/login",
  /** Landing pública (visitante não autenticado). */
  landing: () => "/",
  /** Home interna (usuário autenticado) — substitui a ideia de rota `/busca`. */
  home: () => "/home",
  user: () => "/user", // NOVO (pra parar de hardcode)
  /** Listagem pública (legada; não é a home principal do usuário logado). */
  produtos: () => "/produtos",
  /** Resultados de busca na listagem pública (`ProductsPage`). */
  search: (queryString: string) => `/produtos?${queryString}`,
  /** Busca na home logada — usa `q` (compat: `?search=` ainda é lido na home). */
  homeWithSearch: (q: string) =>
    q.trim()
      ? `/home?q=${encodeURIComponent(q.trim())}`
      : "/home",
  editAddress: (id: number | string) => `/editAddress/${id}`,
} as const;
