/**
 * Tipos mínimos para GET /v1/carrinho, POST /v1/carrinho/itens e PUT /v1/carrinho/itens/{id}.
 * O envelope real pode variar; use `unwrapCartItemsFromPayload` / `totalUnidadesNoCarrinho`.
 */

import type { ProdutoId } from "@/types/produto";

export type CartItem = {
  id?: number | string;
  produto_id?: number;
  quantidade?: number;
};

export type Cart = {
  id?: number | string;
  itens?: CartItem[];
  items?: CartItem[];
};

/** Corpo do POST /v1/carrinho/itens (snake_case, alinhado às demais rotas do projeto). */
export type AddCartItemPayload = {
  produto_id: number;
  quantidade: number;
};

/** Corpo do PUT /v1/carrinho/itens/{item_id} */
export type UpdateCartItemPayload = {
  quantidade: number;
};

/** Linha do carrinho pronta para cards na UI (após enriquecer com GET produto se necessário). */
export type CarrinhoItemCardView = {
  key: string;
  /** Id da linha no backend (não confundir com produto_id). Ausente = não dá para PUT/DELETE. */
  lineItemId: string | number | null;
  produtoId: ProdutoId;
  titulo: string;
  precoTexto: string | null;
  imagemUrl: string | null;
  statusOuCondicao: string | null;
  quantidade: number | null;
  subtotalTexto: string | null;
  vendedorTexto: string | null;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Extrai a lista bruta de linhas do carrinho a partir da resposta do GET. */
export function unwrapCartItemsFromPayload(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (!isRecord(data)) return [];

  const direct = data.itens ?? data.items;
  if (Array.isArray(direct)) return direct;

  const carrinho = data.carrinho;
  if (isRecord(carrinho)) {
    const inner = carrinho.itens ?? carrinho.items;
    if (Array.isArray(inner)) return inner;
  }

  const innerData = data.data;
  if (Array.isArray(innerData)) return innerData;
  if (isRecord(innerData)) {
    const nested = innerData.itens ?? innerData.items;
    if (Array.isArray(nested)) return nested;
  }

  return [];
}

function formatBrlNumber(n: number): string {
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(n);
  } catch {
    return String(n);
  }
}

function parsePositiveInt(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return Math.floor(v);
  if (typeof v === "string" && /^\d+$/.test(v.trim())) {
    const n = Number(v.trim());
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

/** Extrai id do produto de uma linha do carrinho (objeto aninhado ou campos comuns). */
export function extractProdutoIdFromCartEntry(item: unknown): ProdutoId | null {
  if (typeof item === "number" && Number.isFinite(item)) return item;
  if (typeof item === "string" && item.trim()) return item.trim();
  if (!isRecord(item)) return null;

  const keys = [
    "produto_id",
    "id_produto",
    "produtoId",
    "product_id",
    "idProduto",
  ] as const;
  for (const k of keys) {
    const v = item[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim()) return v.trim();
  }

  const nested = item.produto ?? item.product ?? item.item;
  if (isRecord(nested)) {
    const id = nested.id ?? nested.produto_id ?? nested.product_id;
    if (typeof id === "number" && Number.isFinite(id)) return id;
    if (typeof id === "string" && id.trim()) return id.trim();
  }

  return null;
}

/** Metadados opcionais da linha vindos diretamente do GET /carrinho. */
export function extractCartLineExtras(entry: unknown): {
  quantidade: number | null;
  subtotalTexto: string | null;
  vendedorTexto: string | null;
} {
  if (!isRecord(entry)) {
    return { quantidade: null, subtotalTexto: null, vendedorTexto: null };
  }

  const quantidade = parsePositiveInt(
    entry.quantidade ?? entry.qty ?? entry.quantity
  );

  let subtotalTexto: string | null = null;
  const sub =
    entry.subtotal ??
    entry.subtotal_texto ??
    entry.subtotalTexto ??
    entry.preco_subtotal ??
    entry.total_linha;
  if (typeof sub === "number" && Number.isFinite(sub)) {
    subtotalTexto = formatBrlNumber(sub);
  } else if (typeof sub === "string" && sub.trim()) {
    subtotalTexto = sub.trim();
  }

  let vendedorTexto: string | null = null;
  const nomeFlat = entry.vendedor_nome ?? entry.vendedorNome ?? entry.seller_name;
  if (typeof nomeFlat === "string" && nomeFlat.trim()) {
    vendedorTexto = nomeFlat.trim();
  } else {
    const v = entry.vendedor ?? entry.seller;
    if (isRecord(v)) {
      const n =
        v.nome ?? v.nome_fantasia ?? v.razao_social ?? v.name ?? v.email;
      if (typeof n === "string" && n.trim()) vendedorTexto = n.trim();
    }
  }

  return { quantidade, subtotalTexto, vendedorTexto };
}

/** Dicas de exibição quando o item do carrinho já inclui objeto `produto` embutido. */
export function extractEmbeddedProdutoCardHints(entry: unknown): {
  titulo: string | null;
  precoTexto: string | null;
  imagemUrl: string | null;
  statusOuCondicao: string | null;
} {
  const empty = {
    titulo: null,
    precoTexto: null,
    imagemUrl: null,
    statusOuCondicao: null,
  };
  if (!isRecord(entry)) return empty;
  const nested = entry.produto ?? entry.product;
  if (!isRecord(nested)) return empty;

  const titulo =
    typeof nested.titulo === "string" && nested.titulo.trim()
      ? nested.titulo.trim()
      : null;

  let precoTexto: string | null = null;
  if (typeof nested.preco === "string" && nested.preco.trim()) {
    precoTexto = nested.preco.trim();
  } else if (typeof nested.precoTexto === "string" && nested.precoTexto.trim()) {
    precoTexto = nested.precoTexto.trim();
  }

  let imagemUrl: string | null = null;
  if (
    typeof nested.imagem_principal_url === "string" &&
    nested.imagem_principal_url.trim()
  ) {
    imagemUrl = nested.imagem_principal_url.trim();
  } else if (Array.isArray(nested.imagens)) {
    const first = nested.imagens[0];
    if (typeof first === "string" && first.trim()) imagemUrl = first.trim();
  }

  const c =
    typeof nested.condicao === "string" && nested.condicao.trim()
      ? nested.condicao.trim()
      : null;
  const s =
    typeof nested.status === "string" && nested.status.trim()
      ? nested.status.trim()
      : null;
  const statusOuCondicao = c ?? s;

  return { titulo, precoTexto, imagemUrl, statusOuCondicao };
}

/**
 * Id da linha do carrinho para PUT/DELETE.
 * Prioriza campos explícitos de linha; não usa produto_id (não é item_id da rota).
 */
export function extractCartLineItemId(entry: unknown): string | number | null {
  if (!isRecord(entry)) return null;
  const candidates = [
    entry.item_id,
    entry.carrinho_item_id,
    entry.linha_id,
    entry.id,
  ] as const;
  for (const v of candidates) {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

/** Chave estável para lista (evita colisão entre linhas do mesmo produto). */
export function cartLineStableKey(entry: unknown, index: number): string {
  if (!isRecord(entry)) return `line-${index}`;
  const lineId = extractCartLineItemId(entry);
  if (lineId != null) return String(lineId);
  const pid = extractProdutoIdFromCartEntry(entry);
  if (pid != null) return `${String(pid)}-${index}`;
  return `line-${index}`;
}

/** Soma unidades (usa `quantidade` quando existir; senão conta 1 por linha). */
export function totalUnidadesNoCarrinho(data: unknown): number {
  const rows = unwrapCartItemsFromPayload(data);
  let sum = 0;
  for (const row of rows) {
    if (!isRecord(row)) {
      sum += 1;
      continue;
    }
    const q = row.quantidade ?? row.qty ?? row.quantity;
    if (typeof q === "number" && Number.isFinite(q) && q > 0) {
      sum += q;
      continue;
    }
    if (typeof q === "string") {
      const parsed = Number(q);
      if (Number.isFinite(parsed) && parsed > 0) {
        sum += parsed;
        continue;
      }
    }
    sum += 1;
  }
  return sum;
}
