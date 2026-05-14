/** Id exposto pelo backend (aceita formatos comuns). */
export type ProdutoId = string | number;

export type ProdutoListagemItem = {
  id: number;
  vendedor_id: number;
  categoria_id: number;
  marca_id: number;
  titulo: string;
  /** Presente em listagens públicas (ex.: lançamentos) para link amigável. */
  slug?: string;
  preco: string | number;
  preco_promocional: string | number | null;
  imagem_principal_url: string | null;
  ativo?: boolean;
  status?: string;
};

export type ProdutoListagemResponse = {
  items: ProdutoListagemItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};

export type ProdutoCreateMeta = {
  categoria_id: number;
  marca_id: number;
  titulo: string;
  slug?: string;
  descricao: string;
  preco: string;
  preco_promocional?: string | null;
  condicao: "novo" | "usado";
  sku?: string;
  peso_gramas?: number;
  altura_cm?: number;
  largura_cm?: number;
  comprimento_cm?: number;
  ativo?: boolean;
  estoque_inicial: number;
  imagem_principal_index?: number;
  indexadores?: string[];
};

/** Visão normalizada para listagem na UI (campos opcionais no contrato real). */
export type ProdutoListaView = {
  id: ProdutoId;
  titulo: string;
  precoTexto: string | null;
  imagemUrl: string | null;
  statusOuCondicao: string | null;
};

/** Item de `indexadores` no GET público do produto (`{ campo, valor }`). */
export type ProdutoIndexadorView = {
  campo: string;
  valor: string;
};

/** Visão normalizada para página de detalhe (campos opcionais no contrato real). */
export type ProdutoDetalheView = {
  id: ProdutoId;
  titulo: string;
  precoTexto: string | null;
  descricao: string | null;
  condicao: string | null;
  status: string | null;
  imagens: string[];
  estoqueTexto: string | null;
  /** Indexadores da API: objetos `{ campo, valor }` ou legado `string[]`. */
  indexadores: ProdutoIndexadorView[];
};

export type PerguntaView = {
  texto: string;
  resposta: string | null;
  meta: string | null;
};

export type AvaliacaoView = {
  notaTexto: string | null;
  comentario: string | null;
  meta: string | null;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function pickString(record: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const k of keys) {
    const v = record[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function pickId(record: Record<string, unknown>): ProdutoId | null {
  for (const k of ["id", "produto_id", "_id"] as const) {
    const v = record[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
}

function extractImagemUrl(record: Record<string, unknown>): string | null {
  const directKeys = [
    "imagem_principal_url",
    "imagem_principal",
    "imagem_principal_base64",
    "imagemPrincipal",
    "foto_principal",
    "foto_principal_url",
    "image_url",
    "foto",
    "url_imagem",
    "image",
    "thumbnail_url",
    "capa",
  ] as const;
  for (const k of directKeys) {
    const v = record[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }

  const nested = record.imagem ?? record.image;
  if (isRecord(nested)) {
    const u = nested.url ?? nested.src ?? nested.path ?? nested.base64;
    if (typeof u === "string" && u.trim()) return u.trim();
  }

  const imgs = record.imagens ?? record.images;
  if (Array.isArray(imgs) && imgs.length > 0) {
    const first = imgs[0];
    if (typeof first === "string" && first.trim()) return first.trim();
    if (isRecord(first)) {
      const u = first.url ?? first.src ?? first.path ?? first.link ?? first.base64;
      if (typeof u === "string" && u.trim()) return u.trim();
    }
  }

  return null;
}

function extractPrecoRaw(record: Record<string, unknown>): unknown {
  const keys = [
    "preco_promocional",
    "preco",
    "preço",
    "valor",
    "price",
    "preco_venda",
    "valor_venda",
    "preco_decimal",
  ] as const;
  for (const k of keys) {
    const v = record[k];
    if (v == null) continue;
    if (typeof v === "number" || typeof v === "string") return v;
    if (isRecord(v)) {
      const inner = v.valor ?? v.amount ?? v.value ?? v.preco;
      if (typeof inner === "number" || typeof inner === "string") return inner;
    }
  }
  return null;
}

function formatPrecoTexto(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    try {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 2,
      }).format(raw);
    } catch {
      return String(raw);
    }
  }
  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t) return null;
    return t;
  }
  return null;
}

function extractStatusOuCondicao(record: Record<string, unknown>): string | null {
  const novoKeys = ["novo", "eh_novo", "is_novo", "produto_novo", "isNew"] as const;
  for (const k of novoKeys) {
    const v = record[k];
    if (v === true) return "novo";
    if (v === "true" || v === "1" || v === 1) return "novo";
  }
  return pickString(record, [
    "condicao",
    "condição",
    "condicao_produto",
    "status",
    "estado",
    "situacao",
    "situação",
    "disponibilidade",
  ]);
}

function fallbackTitulo(record: Record<string, unknown>): string {
  const t = pickString(record, [
    "titulo",
    "titulo_produto",
    "nome",
    "name",
    "descricao_curta",
    "descricaoCurta",
    "descricao",
    "sku",
    "slug",
  ]);
  return t ?? "Produto";
}

/**
 * Aceita payloads comuns para listagens: [], { items }, { produtos }.
 */
export function unwrapProdutosListPayload(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (!isRecord(data)) return [];

  const { items, produtos, data: inner } = data;
  if (Array.isArray(items)) return items;
  if (Array.isArray(produtos)) return produtos;
  if (Array.isArray(inner)) return inner;

  return [];
}

export function itemUnknownToListaView(item: unknown): ProdutoListaView | null {
  if (!isRecord(item)) return null;
  const id = pickId(item);
  if (id == null) return null;

  const titulo = fallbackTitulo(item);
  const precoTexto = formatPrecoTexto(extractPrecoRaw(item));
  const imagemUrl = extractImagemUrl(item);
  const statusOuCondicao = extractStatusOuCondicao(item);

  return {
    id,
    titulo,
    precoTexto,
    imagemUrl,
    statusOuCondicao,
  };
}

export function normalizeProdutosListResponse(data: unknown): ProdutoListaView[] {
  const rawItems = unwrapProdutosListPayload(data);
  const out: ProdutoListaView[] = [];
  for (const raw of rawItems) {
    const v = itemUnknownToListaView(raw);
    if (v) out.push(v);
  }
  return out;
}

/** Metadados opcionais quando o backend devolve objeto paginado. */
export type ProdutosListPaginationMeta = {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};

function pickPositiveInt(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v) && v >= 0) return Math.floor(v);
  if (typeof v === "string" && v.trim()) {
    const n = Number.parseInt(v, 10);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return null;
}

/**
 * Normaliza itens da listagem e extrai paginação quando presente na raiz do payload.
 */
export function normalizeProdutosListResponseWithMeta(data: unknown): {
  items: ProdutoListaView[];
  meta: ProdutosListPaginationMeta | null;
} {
  const items = normalizeProdutosListResponse(data);

  if (!isRecord(data)) {
    return { items, meta: null };
  }

  const total = pickPositiveInt(data.total);
  const page = pickPositiveInt(data.page);
  const page_size = pickPositiveInt(data.page_size);
  const total_pages = pickPositiveInt(data.total_pages);

  if (
    total != null &&
    page != null &&
    page >= 1 &&
    page_size != null &&
    page_size >= 1 &&
    total_pages != null
  ) {
    return {
      items,
      meta: { total, page, page_size, total_pages },
    };
  }

  return { items, meta: null };
}

// --- Detalhe, perguntas e avaliações ---

function pushImageUrl(out: string[], url: string | null | undefined) {
  if (!url || !url.trim()) return;
  const t = url.trim();
  if (!out.includes(t)) out.push(t);
}

function collectImagensFromArray(out: string[], arr: unknown) {
  if (!Array.isArray(arr)) return;
  for (const el of arr) {
    if (typeof el === "string") pushImageUrl(out, el);
    else if (isRecord(el)) {
      const u = el.url ?? el.src ?? el.path ?? el.link ?? el.base64;
      if (typeof u === "string") pushImageUrl(out, u);
    }
  }
}

function extractImagensDetalheList(record: Record<string, unknown>): string[] {
  const out: string[] = [];
  collectImagensFromArray(out, record.imagens);
  collectImagensFromArray(out, record.images);
  collectImagensFromArray(out, record.fotos);
  collectImagensFromArray(out, record.galeria);
  collectImagensFromArray(out, record.midias);
  const principal = extractImagemUrl(record);
  if (principal) {
    const copy = out.filter((u) => u !== principal);
    out.length = 0;
    pushImageUrl(out, principal);
    for (const u of copy) pushImageUrl(out, u);
  }
  return out;
}

function extractDescricaoDetalhe(record: Record<string, unknown>): string | null {
  const keys = [
    "descricao",
    "descricao_completa",
    "descricaoCompleta",
    "descricao_longa",
    "descricaoLonga",
    "detalhes",
    "texto",
    "observacoes",
  ] as const;
  for (const k of keys) {
    const v = record[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function extractCondicaoDetalhe(record: Record<string, unknown>): string | null {
  return pickString(record, ["condicao", "condição", "condicao_produto", "estado_conservacao"]);
}

function extractStatusDetalhe(record: Record<string, unknown>): string | null {
  return pickString(record, [
    "status",
    "status_produto",
    "situacao",
    "situação",
    "estado_anuncio",
    "publicacao_status",
  ]);
}

function extractIndexadoresDetalhe(record: Record<string, unknown>): ProdutoIndexadorView[] {
  const raw = record.indexadores ?? record.tags ?? record.palavras_chave;
  if (!Array.isArray(raw)) return [];
  const out: ProdutoIndexadorView[] = [];
  const seen = new Set<string>();

  const push = (campoRaw: string | null, valorRaw: string) => {
    const valor = valorRaw.trim();
    if (!valor) return;
    const trimmedCampo = campoRaw?.trim();
    const campo =
      !trimmedCampo || trimmedCampo.toLowerCase() === "geral" ? "geral" : trimmedCampo;
    const key = `${campo.toLowerCase()}\0${valor.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ campo, valor });
  };

  const pickCampoIndexador = (rec: Record<string, unknown>): string | null => {
    const flat = pickString(rec, [
      "nome_campo",
      "nomeCampo",
      "campo_nome",
      "campoNome",
      "label_campo",
      "titulo_campo",
      "campo",
      "grupo",
      "categoria",
      "tipo",
      "chave",
      "key",
    ]);
    if (flat) return flat;
    const nested = rec.campo ?? rec.field;
    if (isRecord(nested)) {
      return pickString(nested, [
        "nome",
        "titulo",
        "label",
        "descricao",
        "name",
        "chave",
        "key",
      ]);
    }
    return null;
  };

  const pickValorIndexador = (rec: Record<string, unknown>): string | null => {
    const flat = pickString(rec, [
      "nome_valor",
      "nomeValor",
      "valor_nome",
      "valorNome",
      "label_valor",
      "titulo_valor",
      "valor",
      "value",
      "texto",
      "tag",
      "nome",
      "indexador",
    ]);
    if (flat) return flat;
    const nested = rec.valor ?? rec.value;
    if (isRecord(nested)) {
      return pickString(nested, [
        "nome",
        "titulo",
        "label",
        "texto",
        "descricao",
        "valor",
        "value",
      ]);
    }
    return null;
  };

  for (const el of raw) {
    if (typeof el === "string") {
      const t = el.trim();
      if (t) push("geral", t);
      continue;
    }
    if (!isRecord(el)) continue;
    const valor = pickValorIndexador(el);
    if (!valor) continue;
    const campo = pickCampoIndexador(el) ?? "geral";
    push(campo, valor);
  }
  return out;
}

function extractEstoqueTexto(record: Record<string, unknown>): string | null {
  const n =
    record.estoque ?? record.quantidade ?? record.quantidade_estoque ?? record.stock ?? record.qtd;
  if (typeof n === "number" && Number.isFinite(n)) {
    if (n <= 0) return "Sem estoque";
    if (n === 1) return "1 unidade";
    return `${n} unidades`;
  }
  const s = pickString(record, [
    "estoque_texto",
    "disponibilidade_estoque",
    "estoque_disponivel_texto",
  ]);
  if (s) return s;

  const b = record.estoque_disponivel ?? record.disponivel ?? record.in_stock;
  if (typeof b === "boolean") return b ? "Em estoque" : "Indisponível";

  return null;
}

function unwrapProdutoDetalheRecord(data: unknown): Record<string, unknown> | null {
  if (!isRecord(data)) return null;
  const nested = data.data ?? data.produto ?? data.item ?? data.result;
  if (isRecord(nested) && (pickId(nested) != null || pickString(nested, ["titulo", "nome", "name"])))
    return nested;
  if (pickId(data) != null || pickString(data, ["titulo", "nome", "name"])) return data;
  if (isRecord(nested)) return nested;
  return null;
}

export function normalizeProdutoDetalhe(
  routeProdutoId: string,
  data: unknown
): ProdutoDetalheView | null {
  const record = unwrapProdutoDetalheRecord(data);
  if (!record) return null;

  const id = pickId(record) ?? routeProdutoId;
  const titulo = fallbackTitulo(record);
  const imagens = extractImagensDetalheList(record);

  return {
    id,
    titulo,
    precoTexto: formatPrecoTexto(extractPrecoRaw(record)),
    descricao: extractDescricaoDetalhe(record),
    condicao: extractCondicaoDetalhe(record),
    status: extractStatusDetalhe(record),
    imagens,
    estoqueTexto: extractEstoqueTexto(record),
    indexadores: extractIndexadoresDetalhe(record),
  };
}

/**
 * Aceita listas em formatos comuns: [], { items }, { data }, chaves específicas do domínio.
 */
export function unwrapRelacionadosListPayload(data: unknown, domainKeys: readonly string[]): unknown[] {
  if (Array.isArray(data)) return data;
  if (!isRecord(data)) return [];

  const common = ["items", "data", "results", "result"] as const;
  for (const k of common) {
    const v = data[k];
    if (Array.isArray(v)) return v;
  }
  for (const k of domainKeys) {
    const v = data[k];
    if (Array.isArray(v)) return v;
  }
  return [];
}

function itemUnknownToPergunta(item: unknown): PerguntaView | null {
  if (!isRecord(item)) return null;
  const texto = pickString(item, [
    "pergunta",
    "texto",
    "mensagem",
    "titulo",
    "conteudo",
    "conteúdo",
    "duvida",
    "dúvida",
  ]);
  if (!texto) return null;
  const resposta = pickString(item, [
    "resposta",
    "resposta_texto",
    "reply",
    "resposta_mensagem",
  ]);
  const meta = pickString(item, [
    "criado_em",
    "data",
    "data_criacao",
    "created_at",
    "usuario",
    "autor",
    "nome_usuario",
    "nomeAutor",
  ]);
  return { texto, resposta, meta };
}

function formatNotaAvaliacao(raw: unknown): string | null {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return String(raw).replace(".", ",");
  }
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return null;
}

function itemUnknownToAvaliacao(item: unknown): AvaliacaoView | null {
  if (!isRecord(item)) return null;
  const notaRaw =
    item.nota ?? item.rating ?? item.score ?? item.estrelas ?? item.stars ?? item.classificacao;
  const notaTexto = formatNotaAvaliacao(notaRaw);
  const comentario = pickString(item, [
    "comentario",
    "comentário",
    "texto",
    "mensagem",
    "review",
    "descricao",
  ]);
  const meta = pickString(item, [
    "criado_em",
    "data",
    "data_criacao",
    "created_at",
    "usuario",
    "autor",
    "nome_usuario",
    "nomeAutor",
  ]);
  if (!notaTexto && !comentario) return null;
  return {
    notaTexto,
    comentario,
    meta,
  };
}

export function normalizePerguntasResponse(data: unknown): PerguntaView[] {
  const raw = unwrapRelacionadosListPayload(data, ["perguntas", "duvidas", "questions"]);
  const out: PerguntaView[] = [];
  for (const r of raw) {
    const v = itemUnknownToPergunta(r);
    if (v) out.push(v);
  }
  return out;
}

export function normalizeAvaliacoesResponse(data: unknown): AvaliacaoView[] {
  const raw = unwrapRelacionadosListPayload(data, ["avaliacoes", "avaliações", "reviews", "ratings"]);
  const out: AvaliacaoView[] = [];
  for (const r of raw) {
    const v = itemUnknownToAvaliacao(r);
    if (v) out.push(v);
  }
  return out;
}
