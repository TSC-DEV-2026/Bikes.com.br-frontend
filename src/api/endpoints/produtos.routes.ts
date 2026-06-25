import api from "@/api/axiosInstance";
import type {
  ProdutoCondicao,
  ProdutoCreateMeta,
  ProdutoListagemItem,
  ProdutoListagemResponse,
} from "@/types/produto";

export const PRODUTOS_ENDPOINTS = {
  produtos: "/produtos",
  lancamentos: "/produtos/lancamentos",
  produtoById: (produtoId: number | string) => `/produtos/${produtoId}`,
  produtoImagemById: (produtoId: number | string, imagemId: number | string) =>
    `/produtos/${produtoId}/imagens/${imagemId}`,
  produtoEstoqueById: (produtoId: number | string) =>
    `/produtos/${produtoId}/estoque`,
  perguntasByProdutoId: (produtoId: number | string) =>
    `/produtos/${produtoId}/perguntas`,
  avaliacoesByProdutoId: (produtoId: number | string) =>
    `/produtos/${produtoId}/avaliacoes`,
  indexadoresByProdutoId: (produtoId: number | string) =>
    `/produtos/${produtoId}/indexadores`,
} as const;

/** Campos de produto enviados no campo `meta` (JSON) do PUT multipart. */
export type ProdutoUpdatePayload = {
  titulo?: string;
  descricao?: string;
  preco?: number;
  preco_promocional?: number | null;
  condicao?: ProdutoCondicao;
  categoria_id?: number;
  marca_id?: number;
  slug?: string | null;
  sku?: string | null;
  peso_gramas?: number | null;
  altura_cm?: number | null;
  largura_cm?: number | null;
  comprimento_cm?: number | null;
  ativo?: boolean;
  /**
   * `false` (padrão): anexa novas imagens mantendo as ativas.
   * `true`: substitui a galeria ativa pelas imagens enviadas no multipart.
   */
  substituir_imagens?: boolean;
  /** Índice da capa entre os arquivos novos enviados em `imagens` (0-based). */
  imagem_principal_index?: number | null;
  /** ID de imagem já ativa para definir capa (sem reenviar arquivos; não usar com `substituir_imagens=true`). */
  imagem_principal_id?: number | null;
};

export type ProdutoUpdateMultipartOptions = {
  imagens?: Array<File | Blob>;
  file?: File | Blob | null;
};

export type ProdutoDeleteImagemResponse = {
  message: string;
};

/** Valores aceitos por GET /produtos?ordenacao= (contrato FastAPI). */
export const PRODUTOS_LIST_ORDENACAO_VALUES = [
  "recentes",
  "menor_preco",
  "maior_preco",
] as const;

export type ProdutosListOrdenacao =
  (typeof PRODUTOS_LIST_ORDENACAO_VALUES)[number];

const LEGACY_ORDENACAO_TO_API: Record<string, ProdutosListOrdenacao> = {
  preco_asc: "menor_preco",
  preco_desc: "maior_preco",
};

/** Normaliza `ordenacao` da URL ou UI para o literal aceito pela API. */
export function normalizeProdutosListOrdenacao(
  raw: string | undefined | null,
): ProdutosListOrdenacao | undefined {
  const o = raw?.trim();
  if (!o) return undefined;
  if (o === "recentes") return "recentes";
  if (
    (PRODUTOS_LIST_ORDENACAO_VALUES as readonly string[]).includes(o)
  ) {
    return o as ProdutosListOrdenacao;
  }
  return LEGACY_ORDENACAO_TO_API[o];
}

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

  const ordenacao =
    normalizeProdutosListOrdenacao(params.ordenacao) ?? "recentes";
  out.ordenacao = ordenacao;

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

/**
 * PUT /v1/produtos/{produto_id} — multipart (`meta` JSON + `imagens`/`file` opcionais).
 * Rota única de edição e gestão de imagens: anexar (`substituir_imagens=false`),
 * substituir galeria (`substituir_imagens=true`), capa nova (`imagem_principal_index`)
 * ou capa existente (`imagem_principal_id`, sem `substituir_imagens=true`).
 */
export function updateProduto(
  produtoId: number | string,
  meta: ProdutoUpdatePayload,
  options?: ProdutoUpdateMultipartOptions,
) {
  if (meta.substituir_imagens === true && meta.imagem_principal_id != null) {
    throw new Error(
      "Não envie `imagem_principal_id` junto com `substituir_imagens=true`.",
    );
  }

  const { imagens, file } = options ?? {};
  if (file && imagens && imagens.length > 0) {
    throw new Error("Não envie `file` e `imagens` juntos ao atualizar produto.");
  }

  const formData = new FormData();
  formData.append("meta", JSON.stringify(meta));

  if (file) {
    formData.append("file", file);
  }

  for (const imagem of imagens ?? []) {
    formData.append("imagens", imagem);
  }

  return api.put<unknown>(PRODUTOS_ENDPOINTS.produtoById(produtoId), formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

/** DELETE /v1/produtos/{produto_id}/imagens/{imagem_id} */
export function deleteProdutoImagem(produtoId: number | string, imagemId: number | string) {
  return api.delete<ProdutoDeleteImagemResponse>(
    PRODUTOS_ENDPOINTS.produtoImagemById(produtoId, imagemId),
  );
}

export type AddProdutoImagensOptions = {
  /** Índice da capa entre os arquivos enviados neste request (0-based). */
  imagem_principal_index?: number | null;
  /**
   * Padrão `false`: anexa novas imagens ativas sem desativar as atuais.
   * Use `true` apenas para substituir toda a galeria ativa.
   */
  substituir_imagens?: boolean;
};

/**
 * Envia imagens via PUT multipart.
 * Padrão: `substituir_imagens=false` (anexa mantendo imagens ativas).
 */
export function addProdutoImagens(
  produtoId: number | string,
  formData: FormData,
  options?: AddProdutoImagensOptions,
) {
  const imagens: File[] = [];
  for (const value of formData.getAll("imagens")) {
    if (value instanceof File) imagens.push(value);
  }
  if (!imagens.length) {
    throw new Error("Nenhuma imagem para enviar.");
  }

  const substituirImagens = options?.substituir_imagens ?? false;
  const meta: ProdutoUpdatePayload = { substituir_imagens: substituirImagens };
  const capaIndex = options?.imagem_principal_index;
  if (capaIndex != null && capaIndex >= 0) {
    meta.imagem_principal_index = capaIndex;
  }

  return updateProduto(produtoId, meta, { imagens });
}

/**
 * PUT /v1/produtos/{produto_id}/estoque — use somente com payload confirmado pelo backend.
 * Documentação local do payload ainda não está consolidada no frontend.
 */
export function updateProdutoEstoque(
  produtoId: number | string,
  payload: Record<string, unknown>,
) {
  return api.put<unknown>(PRODUTOS_ENDPOINTS.produtoEstoqueById(produtoId), payload);
}

type CreateProdutoMultipartInput = {
  meta: ProdutoCreateMeta;
  file?: File | Blob | null;
  imagens?: Array<File | Blob>;
};

/** POST /v1/produtos — cria produto via multipart/form-data. */
export function createProduto(formData: FormData) {
  return api.post<unknown>(PRODUTOS_ENDPOINTS.produtos, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

/** POST /v1/produtos — cria produto via multipart/form-data (meta + imagens). */
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

  return createProduto(formData);
}

export type ProdutoIndexadorCampoValor = {
  campo: string;
  valor: string;
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

/** POST /v1/produtos/{produto_id}/indexadores — corpo: lista de { campo, valor }. */
export function postProdutoIndexadores(
  produtoId: number | string,
  indexadores: ProdutoIndexadorCampoValor[],
) {
  return api.post<unknown>(
    PRODUTOS_ENDPOINTS.indexadoresByProdutoId(produtoId),
    indexadores,
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
