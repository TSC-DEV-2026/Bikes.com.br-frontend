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
  /** Entrada do fluxo &quot;Vender&quot; (valida vendedor e redireciona). */
  vender: () => "/vender",
  /** Painel da loja (resumo + edição sob demanda). */
  minhaLoja: () => "/minha-loja",
  /** Pré-visualização do anúncio no modo vendedor (somente leitura). */
  minhaLojaProduto: (produtoId: number | string) =>
    `/minha-loja/produtos/${encodeURIComponent(String(produtoId))}`,
  /** Edição do anúncio em tela dedicada. */
  minhaLojaProdutoEditar: (produtoId: number | string) =>
    `/minha-loja/produtos/${encodeURIComponent(String(produtoId))}/editar`,
  /** Escolha da categoria principal antes do cadastro (com header/footer). */
  venderAnunciar: () => "/vender/anunciar",
  /** Introdução ao cadastro de produto (com header/footer). */
  venderCadastroProduto: () => "/vender/cadastro-produto",
  /** Wizard de cadastro de produto (layout limpo, sem header/footer). */
  venderCadastroProdutoFormulario: (params?: {
    categoriaId: number;
    categoriaSlug: string;
  }) => {
    const base = "/vender/cadastro-produto/formulario";
    if (!params) return base;
    const q = new URLSearchParams({
      categoria_id: String(params.categoriaId),
      categoria_slug: params.categoriaSlug,
    });
    return `${base}?${q.toString()}`;
  },
} as const;
