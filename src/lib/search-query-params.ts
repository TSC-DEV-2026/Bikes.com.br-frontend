/** Lê termo de busca da URL (`q` preferencial; `search` legado). */
export function readSearchQueryParam(
  searchParams: URLSearchParams,
): string {
  const q = searchParams.get("q")?.trim();
  if (q) return q;
  return searchParams.get("search")?.trim() ?? "";
}

/** Lê `ordenacao` da URL, quando presente. */
export function readOrdenacaoParam(
  searchParams: URLSearchParams,
): string | undefined {
  const o = searchParams.get("ordenacao")?.trim();
  return o || undefined;
}

/** Grava busca na URL usando `q`. */
export function writeSearchQueryParam(
  term: string,
): Record<string, string> | Record<string, never> {
  const t = term.trim();
  return t ? { q: t } : {};
}

/** Monta query string para catálogo (`q`, `ordenacao`). */
export function buildCatalogQueryParams(options: {
  q?: string;
  ordenacao?: string;
}): Record<string, string> {
  const out: Record<string, string> = {};
  const q = options.q?.trim();
  if (q) out.q = q;
  const ordenacao = options.ordenacao?.trim();
  if (ordenacao) out.ordenacao = ordenacao;
  return out;
}

/** Path da SPA com query de catálogo. */
export function catalogUrl(
  path: string,
  params: Record<string, string>,
): string {
  const qs = new URLSearchParams(params).toString();
  return qs ? `${path}?${qs}` : path;
}
