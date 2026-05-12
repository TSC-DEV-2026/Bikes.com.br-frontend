import api from "@/api/axiosInstance";
import type {
  ProdutoCreateMeta,
  ProdutoListagemItem,
  ProdutoListagemResponse,
} from "@/types/produto";

export const PRODUTOS_ENDPOINTS = {
  produtos: "/produtos",
  lancamentos: "/produtos/lancamentos",
  produtoById: (produtoId: number | string) => `/produtos/${produtoId}`,
  perguntasByProdutoId: (produtoId: number | string) =>
    `/produtos/${produtoId}/perguntas`,
  avaliacoesByProdutoId: (produtoId: number | string) =>
    `/produtos/${produtoId}/avaliacoes`,
  indexadoresByProdutoId: (produtoId: number | string) =>
    `/produtos/${produtoId}/indexadores`,
} as const;

export type ListProdutosParams = {
  q?: string;
  /** Termos para busca por indexador (ex.: `mtb,trilha,aro 29`). */
  indexador?: string;
  categoria_id?: number;
  marca_id?: number;
  preco_min?: number;
  preco_max?: number;
  condicao?: string;
  status?: string;
  vendedor_id?: number;
  ordenacao?: string;
  page?: number;
  page_size?: number;
};

/** Monta query para GET /produtos sem chaves vazias, undefined ou null. */
export function compactListProdutosParams(
  params: ListProdutosParams | undefined
): Record<string, string | number> | undefined {
  if (!params) return undefined;
  const out: Record<string, string | number> = {};

  const q = params.q?.trim();
  if (q) out.q = q;

  const indexador = params.indexador?.trim();
  if (indexador) out.indexador = indexador;

  if (
    params.categoria_id != null &&
    Number.isFinite(params.categoria_id)
  ) {
    out.categoria_id = params.categoria_id;
  }
  if (params.marca_id != null && Number.isFinite(params.marca_id)) {
    out.marca_id = params.marca_id;
  }
  if (params.preco_min != null && Number.isFinite(params.preco_min)) {
    out.preco_min = params.preco_min;
  }
  if (params.preco_max != null && Number.isFinite(params.preco_max)) {
    out.preco_max = params.preco_max;
  }

  const condicao = params.condicao?.trim().toLowerCase();
  if (condicao) out.condicao = condicao;

  const status = params.status?.trim();
  if (status) out.status = status;

  if (params.vendedor_id != null && Number.isFinite(params.vendedor_id)) {
    out.vendedor_id = params.vendedor_id;
  }

  const ordenacao = params.ordenacao?.trim();
  if (ordenacao) out.ordenacao = ordenacao;

  if (params.page != null && Number.isFinite(params.page) && params.page >= 1) {
    out.page = params.page;
  }
  if (
    params.page_size != null &&
    Number.isFinite(params.page_size) &&
    params.page_size >= 1 &&
    params.page_size <= 100
  ) {
    out.page_size = params.page_size;
  }

  return Object.keys(out).length ? out : undefined;
}

/**
 * GET /v1/produtos (baseURL já inclui /v1).
 * Listagem pública; usa `api` sem exigir auth.
 */
export function listProdutos(params?: ListProdutosParams) {
  const compact = compactListProdutosParams(params);
  return api.get<ProdutoListagemResponse>(PRODUTOS_ENDPOINTS.produtos, {
    params: compact,
  });
}

/** GET /v1/produtos/lancamentos — lista pública aleatória limitada pelo backend. */
export function listLancamentos() {
  return api.get<ProdutoListagemItem[]>(PRODUTOS_ENDPOINTS.lancamentos);
}

/** GET /v1/produtos/{produto_id} */
export function getProdutoById(produtoId: number | string) {
  return api.get<unknown>(PRODUTOS_ENDPOINTS.produtoById(produtoId));
}

type CreateProdutoMultipartInput = {
  meta: ProdutoCreateMeta;
  file?: File | Blob | null;
  imagens?: Array<File | Blob>;
};

/** POST /v1/produtos — cria produto via multipart/form-data. */
export function createProdutoMultipart({
  meta,
  file,
  imagens,
}: CreateProdutoMultipartInput) {
  if (file && imagens && imagens.length > 0) {
    throw new Error("Não envie `file` e `imagens` juntos ao criar produto.");
  }

  const formData = new FormData();
  formData.append("meta", JSON.stringify(meta));

  if (file) {
    formData.append("file", file);
  }

  for (const imagem of imagens ?? []) {
    formData.append("imagens", imagem);
  }

  return api.post<unknown>(PRODUTOS_ENDPOINTS.produtos, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export type AddProdutoIndexadoresPayload = {
  indexadores: string[];
};

export type ProdutoIndexador = {
  id: number;
  uuid: string;
  produto_id: number;
  indexador: string;
  indexador_normalizado: string;
  ativo: boolean;
  criado_em: string;
};

/** POST /v1/produtos/{produto_id}/indexadores */
export function addProdutoIndexadores(
  produtoId: number | string,
  payload: AddProdutoIndexadoresPayload
) {
  return api.post<ProdutoIndexador[]>(
    PRODUTOS_ENDPOINTS.indexadoresByProdutoId(produtoId),
    payload
  );
}

/** GET /v1/produtos/{produto_id}/perguntas */
export function listProdutoPerguntas(produtoId: number | string) {
  return api.get<unknown>(PRODUTOS_ENDPOINTS.perguntasByProdutoId(produtoId));
}

/** GET /v1/produtos/{produto_id}/avaliacoes */
export function listProdutoAvaliacoes(produtoId: number | string) {
  return api.get<unknown>(PRODUTOS_ENDPOINTS.avaliacoesByProdutoId(produtoId));
}
