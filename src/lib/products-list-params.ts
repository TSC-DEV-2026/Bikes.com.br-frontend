import {
  normalizeProdutosListOrdenacao,
  type ProdutosListOrdenacao,
} from "@/api/endpoints/produtos.routes";

/** Opções de ordenação exibidas na UI (valores = contrato GET /produtos). */
export const PRODUTOS_LIST_ORDENACAO_OPTIONS = [
  { value: "recentes", label: "Mais recentes" },
  { value: "menor_preco", label: "Menor preço" },
  { value: "maior_preco", label: "Maior preço" },
] as const satisfies ReadonlyArray<{
  value: ProdutosListOrdenacao;
  label: string;
}>;

/** Filtros suportados por GET /produtos (query string da listagem pública). */
export type ProductsListFilters = {
  q?: string;
  ordenacao?: ProdutosListOrdenacao;
  categoria_id?: number;
  marca_id?: number;
  condicao?: string;
  preco_min?: number;
  preco_max?: number;
};

function parsePositiveInt(raw: string | null): number | undefined {
  if (!raw?.trim()) return undefined;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function parseNonNegativeNumber(raw: string | null): number | undefined {
  if (!raw?.trim()) return undefined;
  const n = Number.parseFloat(raw.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function readProductsListFilters(
  searchParams: URLSearchParams,
): ProductsListFilters {
  const q = searchParams.get("q")?.trim() || searchParams.get("search")?.trim();
  const ordenacao = normalizeProdutosListOrdenacao(
    searchParams.get("ordenacao"),
  );
  const condicao = searchParams.get("condicao")?.trim();

  return {
    ...(q ? { q } : {}),
    ...(ordenacao && ordenacao !== "recentes" ? { ordenacao } : {}),
    categoria_id: parsePositiveInt(searchParams.get("categoria_id")),
    marca_id: parsePositiveInt(searchParams.get("marca_id")),
    ...(condicao ? { condicao } : {}),
    preco_min: parseNonNegativeNumber(searchParams.get("preco_min")),
    preco_max: parseNonNegativeNumber(searchParams.get("preco_max")),
  };
}

export function writeProductsListFilters(
  filters: ProductsListFilters,
): Record<string, string> {
  const out: Record<string, string> = {};
  const q = filters.q?.trim();
  if (q) out.q = q;
  const ordenacao = normalizeProdutosListOrdenacao(filters.ordenacao);
  if (ordenacao && ordenacao !== "recentes") out.ordenacao = ordenacao;
  if (filters.categoria_id != null) {
    out.categoria_id = String(filters.categoria_id);
  }
  if (filters.marca_id != null) {
    out.marca_id = String(filters.marca_id);
  }
  const condicao = filters.condicao?.trim();
  if (condicao) out.condicao = condicao;
  if (filters.preco_min != null) out.preco_min = String(filters.preco_min);
  if (filters.preco_max != null) out.preco_max = String(filters.preco_max);
  return out;
}

export function countActiveProductsListFilters(
  filters: ProductsListFilters,
): number {
  let n = 0;
  if (filters.categoria_id != null) n += 1;
  if (filters.marca_id != null) n += 1;
  if (filters.condicao?.trim()) n += 1;
  if (filters.preco_min != null) n += 1;
  if (filters.preco_max != null) n += 1;
  if (filters.ordenacao && filters.ordenacao !== "recentes") n += 1;
  return n;
}
