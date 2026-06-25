import { paths } from "@/api/endpoints/paths";
import { catalogUrl } from "@/lib/search-query-params";

export type QuickFilterChip = {
  id: string;
  label: string;
  href: string;
};

/** Filtros de categoria — navegam com `q` na home pública. */
export const MARKETPLACE_CATEGORY_FILTER_CHIPS: QuickFilterChip[] = [
  {
    id: "bikes",
    label: "Bikes",
    href: catalogUrl(paths.home(), { q: "bikes" }),
  },
  {
    id: "pecas",
    label: "Peças",
    href: catalogUrl(paths.home(), { q: "peças" }),
  },
  {
    id: "acessorios",
    label: "Acessórios",
    href: catalogUrl(paths.home(), { q: "acessórios" }),
  },
];

/** Ordenação — sem termo de busca na home. */
export const MARKETPLACE_SORT_FILTER_CHIPS: QuickFilterChip[] = [
  {
    id: "recentes",
    label: "Mais recentes",
    href: paths.home(),
  },
];

/** @deprecated Use MARKETPLACE_CATEGORY_FILTER_CHIPS + MARKETPLACE_SORT_FILTER_CHIPS */
export const MARKETPLACE_QUICK_FILTER_CHIPS: QuickFilterChip[] = [
  ...MARKETPLACE_CATEGORY_FILTER_CHIPS,
  ...MARKETPLACE_SORT_FILTER_CHIPS,
];

/** URL do fluxo de venda para visitante (login com retorno a /vender). */
export const MARKETPLACE_SELL_CTA_HREF = "/login?next=%2Fvender";

/**
 * Destaca chip ativo com base na query `q` da URL atual.
 * `recentes` fica ativo quando não há termo de busca.
 */
export function resolveActiveQuickFilterId(
  searchQuery: string,
): string | null {
  const q = searchQuery.trim().toLowerCase();
  if (!q) return "recentes";
  if (q === "bikes" || q === "bike" || q.includes("bicicleta")) {
    return "bikes";
  }
  if (q.includes("peça") || q.includes("peca") || q.includes("peças")) {
    return "pecas";
  }
  if (q.includes("acess")) return "acessorios";
  return null;
}
