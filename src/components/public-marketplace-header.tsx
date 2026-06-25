import { useCallback, useEffect } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { FaMagnifyingGlass, FaUser } from "react-icons/fa6";

import { paths } from "@/api/endpoints/paths";
import { Input } from "@/components/ui/input";
import { MarketplaceSellCta } from "@/components/produto/marketplace-sell-cta";
import {
  PUBLIC_MARKETPLACE_CONTAINER_CLASS,
} from "@/lib/public-marketplace-routes";
import {
  readProductsListFilters,
  writeProductsListFilters,
} from "@/lib/products-list-params";
import {
  readSearchQueryParam,
  writeSearchQueryParam,
} from "@/lib/search-query-params";
import { useProductsSearchDraft } from "@/lib/use-products-search-draft";
import { cn } from "@/lib/utils";

function loginHrefFor(pathname: string, search: string): string {
  return `/login?next=${encodeURIComponent(`${pathname}${search}`)}`;
}

export function PublicMarketplaceHeader({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQ = readSearchQueryParam(searchParams);
  const { draft, setDraft, inputRef, markCommitted } = useProductsSearchDraft(urlQ);

  const loginNextHref = loginHrefFor(pathname, search);
  const cartHref = loginHrefFor("/carrinho", "");
  const favoritesHref = loginHrefFor("/favorites", "");

  const commitSearch = useCallback(
    (term: string) => {
      const trimmed = term.trim();
      markCommitted(trimmed);

      if (pathname === "/produtos") {
        const filters = readProductsListFilters(searchParams);
        setSearchParams(
          writeProductsListFilters({
            ...filters,
            q: trimmed || undefined,
          }),
        );
        return;
      }

      const qs = new URLSearchParams(writeSearchQueryParam(trimmed)).toString();
      navigate(qs ? `${paths.produtos()}?${qs}` : paths.produtos());
    },
    [pathname, searchParams, setSearchParams, navigate, markCommitted],
  );

  const submitSearch = () => {
    commitSearch(draft);
  };

  useEffect(() => {
    if (pathname !== "/produtos") return;
    if (draft.trim() !== "" || urlQ === "") return;
    commitSearch("");
  }, [draft, pathname, urlQ, commitSearch]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b border-slate-200/80 bg-white shadow-sm",
        className,
      )}
    >
      <div className={PUBLIC_MARKETPLACE_CONTAINER_CLASS}>
        <div className="flex min-h-14 w-full items-center gap-2 py-2 sm:gap-3">
          <Link
            to={paths.landing()}
            className="flex shrink-0 items-center"
            aria-label="Bikes.com.br — início"
          >
            <img
              src="/img/logo.png"
              alt="Bikes.com.br"
              className="h-8 w-auto sm:h-9"
              width={100}
              height={36}
            />
          </Link>

          <form
            className="flex min-w-0 flex-1 items-center"
            onSubmit={(e) => {
              e.preventDefault();
              submitSearch();
            }}
            role="search"
            aria-label="Buscar no marketplace"
          >
            <div className="relative min-w-0 flex-1">
              <button
                type="submit"
                className="absolute left-1 top-1/2 z-10 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-[#0c1b33]"
                aria-label="Buscar"
              >
                <FaMagnifyingGlass className="size-3.5 sm:size-4" aria-hidden />
              </button>
              <Input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Buscar bikes, peças..."
                className="h-9 w-full border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-[#0c1b33] shadow-none placeholder:text-slate-400 focus-visible:ring-slate-300/80 sm:h-10 sm:pl-10"
              />
            </div>
          </form>

          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            <MarketplaceSellCta className="hidden px-2.5 py-1.5 text-xs lg:inline-flex lg:px-3 lg:text-sm" />

            <Link
              to={cartHref}
              className="relative inline-flex size-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-50"
              title="Entrar para ver o carrinho"
              aria-label="Entrar para ver o carrinho"
            >
              <img src="/img/carrinho.png" alt="" width={22} height={22} aria-hidden />
            </Link>

            <Link
              to={favoritesHref}
              className="relative inline-flex size-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-50"
              title="Entrar para ver favoritos"
              aria-label="Entrar para ver favoritos"
            >
              <img src="/img/favoritos.png" alt="" width={22} height={22} aria-hidden />
            </Link>

            <Link
              to={loginNextHref}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:px-2.5 sm:text-sm"
            >
              <FaUser className="size-3.5 shrink-0" aria-hidden />
              <span className="hidden sm:inline">Entrar</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
