import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { FaMagnifyingGlass } from "react-icons/fa6";
import { Link, useSearchParams } from "react-router-dom";

import { paths } from "@/api/endpoints/paths";
import { listProdutos } from "@/api/endpoints/produtos.routes";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ProductsCatalogFilters } from "@/components/produto/products-catalog-filters";
import { ProdutoVitrineCard } from "@/components/produto/produto-vitrine-card";
import { useAuth } from "@/contexts/auth-context";
import { getAxiosErrorMessage } from "@/lib/api-error";
import { produtosSearchFromUserPhrase } from "@/lib/produtos-search";
import {
  PRODUTOS_LIST_ORDENACAO_OPTIONS,
  readProductsListFilters,
  writeProductsListFilters,
} from "@/lib/products-list-params";
import {
  PUBLIC_MARKETPLACE_CONTAINER_CLASS,
  PUBLIC_MARKETPLACE_HEADER_OFFSET_CLASS,
} from "@/lib/public-marketplace-routes";
import { useProductsSearchDraft } from "@/lib/use-products-search-draft";
import { cn } from "@/lib/utils";
import type { ProdutoId, ProdutoListaView } from "@/types/produto";
import { normalizeProdutosListResponseWithMeta } from "@/types/produto";

function friendlyProdutosError(err: unknown): string {
  if (import.meta.env.DEV) {
    console.error("[produtos] falha na listagem:", err);
    if (axios.isAxiosError(err) && err.response?.data != null) {
      console.error("[produtos] resposta da API:", err.response.data);
    }
  }

  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    if (status === 404) return "Nenhum resultado encontrado no servidor.";
    if (status === 422) {
      if (import.meta.env.DEV) {
        const detail = getAxiosErrorMessage(err, "");
        if (detail) console.warn("[produtos] parâmetros inválidos:", detail);
      }
      return "Não foi possível carregar os produtos.";
    }
    if (status && status >= 500)
      return "Servidor temporariamente indisponível. Tente de novo mais tarde.";
    if (!err.response && err.code === "ERR_NETWORK")
      return "Não foi possível conectar. Verifique sua rede.";
  }
  return "Não foi possível carregar os produtos.";
}

const PAGE_SIZE_OPTIONS = [12, 24, 48] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];
const DEFAULT_PAGE_SIZE: PageSize = 12;

const ORDENACAO_LABELS = Object.fromEntries(
  PRODUTOS_LIST_ORDENACAO_OPTIONS.map((o) => [o.value, o.label]),
) as Record<string, string>;

const PRODUCTS_GRID_CLASS =
  "grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 xl:grid-cols-4";

export default function ProductsPage() {
  const { isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlFilters = useMemo(
    () => readProductsListFilters(searchParams),
    [searchParams],
  );
  const searchQuery = urlFilters.q ?? "";
  const ordenacaoLabel =
    ORDENACAO_LABELS[urlFilters.ordenacao ?? "recentes"] ?? "Mais recentes";

  const {
    draft: searchDraft,
    setDraft: setSearchDraft,
    inputRef: searchInputRef,
    markCommitted: markSearchCommitted,
  } = useProductsSearchDraft(searchQuery);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ProdutoListaView[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(DEFAULT_PAGE_SIZE);

  const loginNextHref = useMemo(() => {
    const next = `/produtos${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    return `/login?next=${encodeURIComponent(next)}`;
  }, [searchParams]);

  const publicHomeHref = isAuthenticated ? paths.home() : paths.landing();

  useEffect(() => {
    setPage(1);
  }, [
    searchQuery,
    urlFilters.categoria_id,
    urlFilters.marca_id,
    urlFilters.condicao,
    urlFilters.preco_min,
    urlFilters.preco_max,
    urlFilters.ordenacao,
  ]);

  const commitSearch = useCallback(
    (term: string) => {
      const trimmed = term.trim();
      markSearchCommitted(trimmed);
      setPage(1);
      setSearchParams(
        writeProductsListFilters({
          ...urlFilters,
          q: trimmed || undefined,
        }),
      );
    },
    [urlFilters, setSearchParams, markSearchCommitted],
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    if (searchDraft.trim() !== "" || searchQuery === "") return;
    commitSearch("");
  }, [isAuthenticated, searchDraft, searchQuery, commitSearch]);

  const runQuery = useCallback(
    async (filters: ReturnType<typeof readProductsListFilters>, currentPage: number, currentPageSize: PageSize) => {
      setLoading(true);
      setError(null);
      try {
        const term = filters.q ?? "";
        const fromPhrase = produtosSearchFromUserPhrase(term);
        const res = await listProdutos({
          ...(fromPhrase
            ? {
                q: fromPhrase.q,
                ...(fromPhrase.indexador
                  ? { indexador: fromPhrase.indexador }
                  : {}),
              }
            : term
              ? { q: term }
              : {}),
          ordenacao: filters.ordenacao ?? "recentes",
          ...(filters.categoria_id != null
            ? { categoria_id: filters.categoria_id }
            : {}),
          ...(filters.marca_id != null ? { marca_id: filters.marca_id } : {}),
          ...(filters.condicao ? { condicao: filters.condicao } : {}),
          ...(filters.preco_min != null ? { preco_min: filters.preco_min } : {}),
          ...(filters.preco_max != null ? { preco_max: filters.preco_max } : {}),
          page: currentPage,
          page_size: currentPageSize,
        });
        const { items: list, meta } = normalizeProdutosListResponseWithMeta(
          res.data,
        );
        setItems(list);
        setTotal(meta?.total ?? list.length);
        setTotalPages(
          meta?.total_pages ??
            Math.max(1, Math.ceil(list.length / currentPageSize)),
        );
      } catch (e) {
        setItems([]);
        setTotal(0);
        setTotalPages(1);
        setError(friendlyProdutosError(e));
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void runQuery(urlFilters, page, pageSize);
  }, [urlFilters, page, pageSize, runQuery]);

  const safePage = Math.min(page, totalPages);

  const submitSearch = () => {
    commitSearch(searchDraft);
  };

  const mainTopOffsetClass = isAuthenticated
    ? "pt-[4.75rem] sm:pt-24"
    : PUBLIC_MARKETPLACE_HEADER_OFFSET_CLASS;

  return (
    <div className="font-sans m-0 min-h-screen bg-slate-50 p-0">
      <div className="relative z-[2000]">
        <Header />
      </div>

      <main className={cn("pb-10", mainTopOffsetClass)}>
        <div
          className={cn(
            PUBLIC_MARKETPLACE_CONTAINER_CLASS,
            "py-6 sm:py-8 lg:py-1",
          )}
        >
          <header className="mb-5 sm:mb-6">
            <Link
              to={publicHomeHref}
              className={cn(
                "mb-4 inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-[#0c1b33] shadow-sm transition-colors sm:mb-5",
                "hover:border-slate-300 hover:bg-slate-50",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#09bc8a]/25 focus-visible:ring-offset-0",
              )}
            >
              <ArrowLeft className="size-4 shrink-0" aria-hidden />
              Voltar
            </Link>
            <h1 className="text-2xl font-black tracking-tight text-[#0c1b33] sm:text-3xl">
              {searchQuery ? (
                <>Resultados para &quot;{searchQuery}&quot;</>
              ) : (
                "Todos os anúncios"
              )}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-slate-600">
              {!loading && !error ? (
                <span>
                  <span className="font-semibold text-[#0c1b33]">{total}</span>{" "}
                  {total === 1 ? "anúncio" : "anúncios"}
                </span>
              ) : null}
              <span className="hidden text-slate-300 sm:inline" aria-hidden>
                |
              </span>
              <span>
                Ordenação:{" "}
                <span className="font-medium text-[#0c1b33]">{ordenacaoLabel}</span>
              </span>
              {!isAuthenticated ? (
                <>
                  <span className="hidden text-slate-300 sm:inline" aria-hidden>
                    |
                  </span>
                  <span>
                    Para comprar ou favoritar,{" "}
                    <Link
                      to={loginNextHref}
                      className="font-semibold text-[#09bc8a] hover:underline"
                    >
                      faça login
                    </Link>
                    .
                  </span>
                </>
              ) : null}
            </div>
          </header>

          {isAuthenticated ? (
            <form
              className="mb-6 sm:mb-8"
              role="search"
              aria-label="Refinar busca de produtos"
              onSubmit={(e) => {
                e.preventDefault();
                submitSearch();
              }}
            >
              <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white p-3 shadow-sm ring-1 ring-slate-100 sm:p-4">
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                  <div className="relative min-w-0 flex-1">
                    <FaMagnifyingGlass
                      className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                      aria-hidden
                    />
                    <input
                      ref={searchInputRef}
                      type="search"
                      value={searchDraft}
                      onChange={(e) => setSearchDraft(e.target.value)}
                      placeholder="Digite o que você procura..."
                      className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50/80 py-2 pl-10 pr-4 text-sm text-[#0c1b33] placeholder:text-slate-400 focus:border-[#09bc8a]/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#09bc8a]/20 sm:h-12 sm:text-base"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#078f6f] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#067a60] disabled:pointer-events-none disabled:opacity-60 sm:h-12 sm:px-6"
                  >
                    <FaMagnifyingGlass className="size-4" aria-hidden />
                    Pesquisar
                  </button>
                </div>
              </div>
            </form>
          ) : null}

          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-6 xl:gap-8">
            <ProductsCatalogFilters searchQuery={searchQuery} />

            <div className="min-w-0 flex-1">
              <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm sm:p-4 md:p-5">
                {loading && (
                  <div className={PRODUCTS_GRID_CLASS}>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={i}
                        className="min-h-[200px] animate-pulse rounded-xl bg-slate-100 sm:min-h-[260px]"
                        aria-hidden
                      />
                    ))}
                  </div>
                )}

                {!loading && error && (
                  <div
                    className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                    role="alert"
                  >
                    {error}
                  </div>
                )}

                {!loading && !error && items.length === 0 && (
                  <div className="flex flex-col items-center justify-center px-4 py-16 text-center sm:py-20">
                    <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-slate-100">
                      <FaMagnifyingGlass
                        className="size-6 text-slate-400"
                        aria-hidden
                      />
                    </div>
                    <p className="text-base font-semibold text-[#0c1b33] sm:text-lg">
                      Nenhum produto encontrado
                    </p>
                    <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-600">
                      Ajuste os filtros ao lado ou tente outro termo na busca
                      acima.
                    </p>
                  </div>
                )}

                {!loading && !error && items.length > 0 && (
                  <>
                    <div className="mb-4 flex items-center justify-between gap-2 border-b border-slate-100 pb-3 text-xs text-slate-500 sm:text-sm">
                      <span>
                        Exibindo{" "}
                        <span className="font-semibold text-[#0c1b33]">
                          {items.length}
                        </span>{" "}
                        nesta página
                      </span>
                      <span className="font-medium text-[#0c1b33]">
                        {ordenacaoLabel}
                      </span>
                    </div>

                    <div className={cn(PRODUCTS_GRID_CLASS, "items-stretch")}>
                      {items.map((p) => {
                        const href = `/produtos/${encodeURIComponent(String(p.id))}`;
                        return (
                          <div key={String(p.id)} className="flex h-full min-w-0">
                            <ProdutoVitrineCard
                              produto={p}
                              href={href}
                              variant="search"
                              favoriteIds={new Set()}
                              pendingFavoriteIds={new Set()}
                              onToggleFavorite={(_id: ProdutoId) => {}}
                              loginHref={
                                isAuthenticated
                                  ? undefined
                                  : `/login?next=${encodeURIComponent(href)}`
                              }
                            />
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-6 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-3 sm:px-4 sm:py-4">
                      <div className="grid grid-cols-1 items-center gap-4 text-sm sm:grid-cols-3">
                        <div className="flex items-center justify-center gap-2 sm:justify-start">
                          <span className="mr-1 hidden text-xs text-slate-500 sm:inline">
                            Por página
                          </span>
                          {PAGE_SIZE_OPTIONS.map((opt) => {
                            const active = pageSize === opt;
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => {
                                  setPageSize(opt);
                                  setPage(1);
                                }}
                                className={cn(
                                  "flex size-9 items-center justify-center rounded-lg border text-sm font-medium transition-colors",
                                  active
                                    ? "border-[#0c1b33] bg-[#0c1b33]/5 text-[#0c1b33]"
                                    : "border-slate-200 bg-white text-[#0c1b33] hover:border-slate-300",
                                )}
                                aria-pressed={active}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>

                        <nav
                          className="flex items-center justify-center gap-3"
                          aria-label="Paginação"
                        >
                          <button
                            type="button"
                            disabled={safePage <= 1}
                            onClick={() => setPage((n) => Math.max(1, n - 1))}
                            className="flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-slate-300 disabled:opacity-40"
                            aria-label="Página anterior"
                          >
                            <ChevronLeft className="size-4" aria-hidden />
                          </button>
                          <button
                            type="button"
                            disabled={safePage >= totalPages}
                            onClick={() =>
                              setPage((n) => Math.min(totalPages, n + 1))
                            }
                            className="flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-slate-300 disabled:opacity-40"
                            aria-label="Próxima página"
                          >
                            <ChevronRight className="size-4" aria-hidden />
                          </button>
                        </nav>

                        <p className="text-center text-sm text-[#0c1b33] sm:text-right">
                          Página <span className="font-semibold">{safePage}</span> de{" "}
                          <span className="font-semibold">{totalPages}</span> ({total}{" "}
                          {total === 1 ? "item" : "itens"})
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
