/**
 * Normalização da lista de favoritos (GET /favoritos).
 * PENDÊNCIA: se o backend só devolver IDs ou um envelope não coberto aqui,
 * os itens podem aparecer como cartões mínimos (`Produto #id`) ou serem omitidos.
 */

import type { ProdutoId, ProdutoListaView } from "@/types/produto";
import { itemUnknownToListaView, unwrapProdutosListPayload } from "@/types/produto";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Desembrulha lista: aceita os mesmos formatos da listagem de produtos + `favoritos` e envelopes aninhados. */
export function unwrapFavoritosListPayload(data: unknown): unknown[] {
  const base = unwrapProdutosListPayload(data);
  if (base.length > 0) return base;

  if (!isRecord(data)) return [];
  const fav = data.favoritos;
  if (Array.isArray(fav)) return fav;

  const alt = data.results;
  if (Array.isArray(alt)) return alt;

  const inner = data.data;
  if (Array.isArray(inner)) return inner;
  if (isRecord(inner)) {
    const nested = unwrapFavoritosListPayload(inner);
    if (nested.length > 0) return nested;
  }

  return [];
}

/** Extrai id do produto a partir de uma entrada da lista de favoritos (objeto aninhado ou só id). */
export function extractProdutoIdFromFavoritoEntry(item: unknown): ProdutoId | null {
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
    const fromNested = itemUnknownToListaView(nested);
    if (fromNested) return fromNested.id;
  }

  const direct = itemUnknownToListaView(item);
  if (direct) return direct.id;

  return null;
}

/** Converte cada entrada em cartão de lista (produto completo ou placeholder por id). */
export function normalizeFavoritosListItems(data: unknown): ProdutoListaView[] {
  const raw = unwrapFavoritosListPayload(data);
  const out: ProdutoListaView[] = [];
  const seen = new Set<string>();

  for (const entry of raw) {
    if (typeof entry === "number" || (typeof entry === "string" && entry.trim())) {
      const id =
        typeof entry === "number" ? entry : entry.trim();
      const key = String(id);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        id,
        titulo: `Produto ${String(id)}`,
        precoTexto: null,
        imagemUrl: null,
        statusOuCondicao: null,
      });
      continue;
    }

    const nested = isRecord(entry) ? entry.produto ?? entry.product : null;
    const source = isRecord(nested) ? nested : entry;
    const view = itemUnknownToListaView(source);
    if (view) {
      const key = String(view.id);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(view);
      continue;
    }

    const idOnly = extractProdutoIdFromFavoritoEntry(entry);
    if (idOnly != null) {
      const key = String(idOnly);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        id: idOnly,
        titulo: `Produto ${String(idOnly)}`,
        precoTexto: null,
        imagemUrl: null,
        statusOuCondicao: null,
      });
    }
  }

  return out;
}

/** Conjunto de ids em formato string para comparação no detalhe. */
export function favoriteIdsFromListPayload(data: unknown): Set<string> {
  const raw = unwrapFavoritosListPayload(data);
  const ids = new Set<string>();
  for (const entry of raw) {
    const id = extractProdutoIdFromFavoritoEntry(entry);
    if (id != null) ids.add(String(id));
  }
  return ids;
}
