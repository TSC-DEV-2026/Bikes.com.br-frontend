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
  /** Opcional na listagem, quando a API envia timestamp ISO. */
  criado_em?: string;
};

export type ProdutoListagemResponse = {
  items: ProdutoListagemItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};

export type IndexadorProduto = {
  campo: string;
  valor: string;
};

/** Condição do produto aceita na API (criação e atualização). */
export type ProdutoCondicao = "novo" | "usado" | "semi-novo";

export const PRODUTO_CONDICAO_OPTIONS: ReadonlyArray<{
  value: ProdutoCondicao;
  label: string;
}> = [
  { value: "novo", label: "Novo" },
  { value: "semi-novo", label: "Semi-novo" },
  { value: "usado", label: "Usado" },
];

export function parseProdutoCondicao(raw: string | null | undefined): ProdutoCondicao {
  const k = String(raw ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/_/g, "-");
  if (k.includes("semi") && k.includes("nov")) return "semi-novo";
  if (k === "seminovo") return "semi-novo";
  if (k.includes("usado")) return "usado";
  return "novo";
}

export function isProdutoCondicao(value: string): value is ProdutoCondicao {
  return PRODUTO_CONDICAO_OPTIONS.some((o) => o.value === value);
}

export function formatProdutoCondicaoLabel(
  condicao: ProdutoCondicao | string | null | undefined,
): string {
  const parsed = parseProdutoCondicao(condicao ?? undefined);
  return PRODUTO_CONDICAO_OPTIONS.find((o) => o.value === parsed)?.label ?? "Novo";
}

export type ProdutoCreateMeta = {
  categoria_id: number;
  marca_id: number;
  titulo: string;
  slug?: string | null;
  descricao: string;
  preco: number;
  preco_promocional?: number | null;
  condicao: ProdutoCondicao;
  status?: string;
  sku?: string | null;
  peso_gramas?: number | null;
  altura_cm?: number | null;
  largura_cm?: number | null;
  comprimento_cm?: number | null;
  ativo?: boolean;
  estoque_inicial?: number;
  indexadores?: IndexadorProduto[];
  imagem_principal_index?: number | null;
};

/** Visão normalizada para listagem na UI (campos opcionais no contrato real). */
export type ProdutoListaView = {
  id: ProdutoId;
  titulo: string;
  /** Preço exibido (promocional quando válido, senão o preço base). */
  precoTexto: string | null;
  /** Preço cheio riscado quando há promo menor que o preço base. */
  precoOriginalTexto: string | null;
  imagemUrl: string | null;
  statusOuCondicao: string | null;
  /** Rótulo de condição (`condicao`), quando a API envia. */
  condicaoLabel?: string | null;
  /** Nome da categoria, quando a API envia. */
  categoriaLabel?: string | null;
  /** Cidade/UF resumidos, quando a API envia. */
  localizacaoLabel?: string | null;
  /** Publicação relativa (ex.: "Há 2 dias"), quando a API envia data. */
  publicadoLabel?: string | null;
};

/** Item de `indexadores` no GET público do produto (`{ campo, valor }`). */
export type ProdutoIndexadorView = {
  campo: string;
  valor: string;
};

/** Item da galeria do produto (GET /produtos/{id}). */
export type ProdutoImagemView = {
  id: number | null;
  url: string;
  principal: boolean;
};

/** Atualiza flags de capa localmente (sem refetch). */
export function withProdutoImagemPrincipal(
  imagens: ProdutoImagemView[],
  principalId: number,
): ProdutoImagemView[] {
  return imagens.map((im) => ({
    ...im,
    principal: im.id === principalId,
  }));
}

/** Remove imagem da lista local; garante uma capa se ainda houver fotos. */
export function withoutProdutoImagem(
  imagens: ProdutoImagemView[],
  imagemId: number,
): ProdutoImagemView[] {
  const rest = imagens.filter((im) => im.id !== imagemId);
  if (!rest.length) return rest;
  if (rest.some((im) => im.principal)) return rest;
  return rest.map((im, idx) => ({ ...im, principal: idx === 0 }));
}

/** Visão normalizada para página de detalhe (campos opcionais no contrato real). */
export type ProdutoDetalheView = {
  id: ProdutoId;
  titulo: string;
  precoTexto: string | null;
  descricao: string | null;
  condicao: string | null;
  status: string | null;
  imagens: string[];
  imagensGaleria: ProdutoImagemView[];
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

function numberishFromRecord(
  record: Record<string, unknown>,
  key: string,
): number | null {
  const v = record[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const t = v.trim().replace(/\s/g, "").replace(",", ".");
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Preço de listagem: promo só quando menor que o preço base. */
function resolveListaViewPrecos(record: Record<string, unknown>): {
  precoTexto: string | null;
  precoOriginalTexto: string | null;
} {
  const base = numberishFromRecord(record, "preco");
  const promo = numberishFromRecord(record, "preco_promocional");

  if (base != null && promo != null && promo < base) {
    return {
      precoTexto: formatPrecoTexto(promo),
      precoOriginalTexto: formatPrecoTexto(base),
    };
  }

  const single = base ?? promo;
  if (single != null) {
    return {
      precoTexto: formatPrecoTexto(single),
      precoOriginalTexto: null,
    };
  }

  return {
    precoTexto: formatPrecoTexto(extractPrecoRaw(record)),
    precoOriginalTexto: null,
  };
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

function extractListaCondicaoLabel(
  record: Record<string, unknown>,
): string | null {
  const raw = pickString(record, [
    "condicao",
    "condição",
    "condicao_produto",
    "estado_conservacao",
  ]);
  if (!raw) return null;
  return formatProdutoCondicaoLabel(raw);
}

function extractListaCategoriaLabel(
  record: Record<string, unknown>,
): string | null {
  const nested = record.categoria ?? record.categoria_data ?? record.subcategoria;
  if (isRecord(nested)) {
    return pickString(nested, ["nome", "titulo", "name", "label"]);
  }
  return pickString(record, [
    "categoria_nome",
    "nome_categoria",
    "subcategoria_nome",
    "categoria_label",
  ]);
}

function extractListaLocalizacaoLabel(
  record: Record<string, unknown>,
): string | null {
  const cidade = pickString(record, [
    "cidade",
    "cidade_nome",
    "nome_cidade",
    "localidade",
  ]);
  const uf = pickString(record, ["uf", "estado_sigla", "sigla_estado"]);
  const estadoNome = pickString(record, ["estado", "estado_nome", "nome_estado"]);
  const ufOuEstado = uf ?? estadoNome;

  if (cidade && ufOuEstado) {
    if (ufOuEstado.length <= 3) return `${cidade} - ${ufOuEstado.toUpperCase()}`;
    return `${cidade} - ${ufOuEstado}`;
  }
  if (cidade) return cidade;
  if (ufOuEstado) return ufOuEstado;

  return pickString(record, ["localizacao", "localização", "endereco_resumo"]);
}

/** Texto relativo de publicação a partir de timestamp ISO da API. */
export function formatProdutoPublicadoRelativo(
  raw: string | null | undefined,
): string | null {
  if (!raw?.trim()) return null;
  const d = new Date(raw.trim());
  if (Number.isNaN(d.getTime())) return null;

  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) return null;

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Agora mesmo";
  if (minutes < 60) return `Há ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Há ${hours} h`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "Ontem";
  if (days < 7) return `Há ${days} dias`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? "Há 1 semana" : `Há ${weeks} semanas`;
  }

  try {
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(d);
  } catch {
    return null;
  }
}

function extractListaPublicadoLabel(
  record: Record<string, unknown>,
): string | null {
  const raw = pickString(record, [
    "criado_em",
    "created_at",
    "publicado_em",
    "data_criacao",
    "data_publicacao",
    "atualizado_em",
  ]);
  return formatProdutoPublicadoRelativo(raw);
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
  const { precoTexto, precoOriginalTexto } = resolveListaViewPrecos(item);
  const imagemUrl = extractImagemUrl(item);
  const statusOuCondicao = extractStatusOuCondicao(item);

  return {
    id,
    titulo,
    precoTexto,
    precoOriginalTexto,
    imagemUrl,
    statusOuCondicao,
    condicaoLabel: extractListaCondicaoLabel(item),
    categoriaLabel: extractListaCategoriaLabel(item),
    localizacaoLabel: extractListaLocalizacaoLabel(item),
    publicadoLabel: extractListaPublicadoLabel(item),
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

function pickImagemUrlFromRecord(rec: Record<string, unknown>): string | null {
  const u = rec.url ?? rec.src ?? rec.path ?? rec.link ?? rec.base64;
  if (typeof u === "string" && u.trim()) return u.trim();
  return null;
}

function isPrincipalFlag(v: unknown): boolean {
  if (v === true || v === 1 || v === "1" || v === "true") return true;
  return false;
}

function collectImagensViewsFromArray(out: ProdutoImagemView[], arr: unknown) {
  if (!Array.isArray(arr)) return;
  for (const el of arr) {
    if (typeof el === "string") {
      const url = el.trim();
      if (!url) continue;
      if (!out.some((item) => item.url === url)) {
        out.push({ id: null, url, principal: false });
      }
      continue;
    }
    if (!isRecord(el)) continue;
    const url = pickImagemUrlFromRecord(el);
    if (!url || out.some((item) => item.url === url)) continue;
    const id =
      parseIdField(el.id) ??
      parseIdField(el.imagem_id) ??
      parseIdField(el.imagemId) ??
      parseIdField(el.id_imagem);
    out.push({
      id: typeof id === "number" ? id : null,
      url,
      principal: isPrincipalFlag(el.principal ?? el.is_principal ?? el.capa),
    });
  }
}

/** Garante no máximo uma imagem com `principal: true` (primeira vence se houver várias). */
export function normalizeProdutoImagensGaleria(views: ProdutoImagemView[]): ProdutoImagemView[] {
  const principal = views.filter((v) => v.principal);
  const rest = views.filter((v) => !v.principal);
  if (!principal.length && views.length > 0) {
    return views.map((v, idx) => ({ ...v, principal: idx === 0 }));
  }
  if (principal.length > 1) {
    const [first, ...others] = principal;
    return [
      first,
      ...others.map((v) => ({ ...v, principal: false })),
      ...rest,
    ];
  }
  return [...principal, ...rest];
}

/** Galeria com id, url e flag `principal` a partir do payload do produto. */
export function extractProdutoImagensViews(data: unknown): ProdutoImagemView[] {
  const record = unwrapProdutoDetalheRecord(data);
  if (!record) return [];

  const out: ProdutoImagemView[] = [];
  collectImagensViewsFromArray(out, record.imagens);
  collectImagensViewsFromArray(out, record.images);
  collectImagensViewsFromArray(out, record.fotos);
  collectImagensViewsFromArray(out, record.galeria);
  collectImagensViewsFromArray(out, record.midias);

  const principalUrl = extractImagemUrl(record);
  if (principalUrl && !out.some((v) => v.url === principalUrl)) {
    out.unshift({ id: null, url: principalUrl, principal: true });
  }

  return normalizeProdutoImagensGaleria(out);
}

function extractImagensDetalheList(record: Record<string, unknown>): string[] {
  return extractProdutoImagensViews(record).map((v) => v.url);
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

export function unwrapProdutoDetalheRecord(data: unknown): Record<string, unknown> | null {
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
  const imagensGaleria = extractProdutoImagensViews(record);
  const imagens = imagensGaleria.map((v) => v.url);

  return {
    id,
    titulo,
    precoTexto: formatPrecoTexto(extractPrecoRaw(record)),
    descricao: extractDescricaoDetalhe(record),
    condicao: extractCondicaoDetalhe(record),
    status: extractStatusDetalhe(record),
    imagens,
    imagensGaleria,
    estoqueTexto: extractEstoqueTexto(record),
    indexadores: extractIndexadoresDetalhe(record),
  };
}

/** Id do vendedor dono do anúncio (GET /produtos/{id}), quando presente no payload. */
export function extractVendedorIdFromProdutoPayload(data: unknown): number | null {
  const record = unwrapProdutoDetalheRecord(data);
  if (!record) return null;
  const keys = ["vendedor_id", "vendedorId", "seller_id", "id_vendedor"] as const;
  for (const k of keys) {
    const v = record[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim()) {
      const n = Number(v.trim());
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function parseIdField(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number.parseInt(v.trim(), 10);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function extractCategoriaMarcaIds(data: unknown): {
  categoria_id: number | null;
  marca_id: number | null;
} {
  const record = unwrapProdutoDetalheRecord(data);
  if (!record) {
    return { categoria_id: null, marca_id: null };
  }

  let categoria_id = parseIdField(record.categoria_id);
  if (categoria_id == null) {
    const catRaw = record.categoria ?? record.categoria_data;
    if (isRecord(catRaw)) {
      categoria_id = parseIdField(catRaw.id);
    }
  }

  let marca_id = parseIdField(record.marca_id);
  if (marca_id == null) {
    const marRaw = record.marca ?? record.marca_data;
    if (isRecord(marRaw)) {
      marca_id = parseIdField(marRaw.id);
    }
  }

  return { categoria_id, marca_id };
}

/** Nomes amigáveis quando a API aninha `categoria` / `marca`. */
export function extractCategoriaMarcaLabels(data: unknown): {
  categoriaLabel: string | null;
  marcaLabel: string | null;
} {
  const record = unwrapProdutoDetalheRecord(data);
  if (!record) return { categoriaLabel: null, marcaLabel: null };

  const catRaw = record.categoria ?? record.categoria_data;
  const marRaw = record.marca ?? record.marca_data;

  let categoriaLabel: string | null = null;
  if (isRecord(catRaw)) {
    categoriaLabel = pickString(catRaw, ["nome", "titulo", "name"]);
  }

  let marcaLabel: string | null = null;
  if (isRecord(marRaw)) {
    marcaLabel = pickString(marRaw, ["nome", "name"]);
  }

  return { categoriaLabel, marcaLabel };
}

export function extractProdutoOpcionaisFromPayload(data: unknown): {
  slug: string;
  sku: string;
  peso_gramas: string;
  altura_cm: string;
  largura_cm: string;
  comprimento_cm: string;
} {
  const record = unwrapProdutoDetalheRecord(data);
  const empty = {
    slug: "",
    sku: "",
    peso_gramas: "",
    altura_cm: "",
    largura_cm: "",
    comprimento_cm: "",
  };
  if (!record) return empty;

  const slug = pickString(record, ["slug", "slug_produto"]) ?? "";
  const sku = pickString(record, ["sku", "codigo_sku", "codigo"]) ?? "";

  const numToStr = (v: unknown): string => {
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
    if (typeof v === "string" && v.trim()) return v.trim();
    return "";
  };

  return {
    slug,
    sku,
    peso_gramas: numToStr(
      record.peso_gramas ?? record.peso ?? record.pesoGrama,
    ),
    altura_cm: numToStr(record.altura_cm ?? record.altura),
    largura_cm: numToStr(record.largura_cm ?? record.largura),
    comprimento_cm: numToStr(record.comprimento_cm ?? record.comprimento),
  };
}

export type ProdutoSellerEditFormValues = {
  titulo: string;
  descricao: string;
  preco: string;
  preco_promocional: string;
  condicao: ProdutoCondicao;
  ativo: boolean;
  estoque_inicial: string;
};

function numberishToInputString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "number" && Number.isFinite(v)) {
    return String(v).replace(".", ",");
  }
  if (typeof v === "string") return v.trim();
  return "";
}

function pickAtivoFromRecord(record: Record<string, unknown>): boolean | null {
  const v = record.ativo ?? record.publicado ?? record.visivel;
  if (typeof v === "boolean") return v;
  if (v === 1 || v === "1" || v === "true") return true;
  if (v === 0 || v === "0" || v === "false") return false;
  return null;
}

/**
 * Valores iniciais do painel de edição do vendedor (somente UI / preview local).
 * Não altera o contrato da API.
 */
export function buildProdutoSellerEditFormValues(
  normalized: ProdutoDetalheView,
  data: unknown
): ProdutoSellerEditFormValues {
  const record = unwrapProdutoDetalheRecord(data);

  const hasPromo =
    record?.preco_promocional != null &&
    record.preco_promocional !== "" &&
    !(
      typeof record.preco_promocional === "number" &&
      !Number.isFinite(record.preco_promocional)
    );

  const precoBase = numberishToInputString(record?.preco);
  const precoPromo = hasPromo ? numberishToInputString(record.preco_promocional) : "";

  const condicao = parseProdutoCondicao(
    String(record?.condicao ?? normalized.condicao ?? "novo"),
  );

  const estoqueKeys = [
    "estoque_inicial",
    "estoque",
    "quantidade",
    "quantidade_estoque",
    "stock",
    "qtd",
  ] as const;
  let estoqueStr = "";
  for (const k of estoqueKeys) {
    const ev = record?.[k];
    if (typeof ev === "number" && Number.isFinite(ev)) {
      estoqueStr = String(Math.trunc(ev));
      break;
    }
    if (typeof ev === "string" && ev.trim()) {
      estoqueStr = ev.trim();
      break;
    }
  }

  return {
    titulo: normalized.titulo,
    descricao: normalized.descricao ?? "",
    preco: precoBase,
    preco_promocional: precoPromo,
    condicao,
    ativo: pickAtivoFromRecord(record ?? {}) ?? true,
    estoque_inicial: estoqueStr,
  };
}

function parsePtBrDecimal(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function precoDisplayFromFormulario(form: ProdutoSellerEditFormValues): string | null {
  const promo = parsePtBrDecimal(form.preco_promocional);
  const base = parsePtBrDecimal(form.preco);
  const chosen = promo != null ? promo : base;
  if (chosen == null) return null;
  return formatPrecoTexto(chosen);
}

function estoqueTextoFromFormulario(form: ProdutoSellerEditFormValues): string | null {
  const t = form.estoque_inicial.trim();
  if (!t) return null;
  const n = Number(t.replace(",", "."));
  if (!Number.isFinite(n)) return t;
  if (n <= 0) return "Sem estoque";
  if (n === 1) return "1 unidade";
  return `${Math.floor(n)} unidades`;
}

/** Atualiza a visão de detalhe usada na página usando apenas edição local. */
export function applyProdutoSellerEditFormToDetalheView(
  base: ProdutoDetalheView,
  form: ProdutoSellerEditFormValues
): ProdutoDetalheView {
  const titulo = form.titulo.trim() || base.titulo;
  const descricao = form.descricao.trim() || null;
  const precoTexto = precoDisplayFromFormulario(form);
  const estoqueTexto = estoqueTextoFromFormulario(form);

  return {
    ...base,
    titulo,
    descricao,
    precoTexto: precoTexto ?? base.precoTexto,
    condicao: form.condicao,
    estoqueTexto: form.estoque_inicial.trim()
      ? estoqueTexto ?? base.estoqueTexto
      : base.estoqueTexto,
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
