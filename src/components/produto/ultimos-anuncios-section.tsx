import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { FaArrowRight } from "react-icons/fa6";

import { listProdutos } from "@/api/endpoints/produtos.routes";
import { ProdutoVitrineCard } from "@/components/produto/produto-vitrine-card";
import { cn } from "@/lib/utils";
import type { ProdutoId, ProdutoListaView } from "@/types/produto";
import { normalizeProdutosListResponseWithMeta } from "@/types/produto";

function friendlyError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (!err.response && err.code === "ERR_NETWORK") {
      return "Sem conexão. Verifique sua rede.";
    }
    if (err.response?.status && err.response.status >= 500) {
      return "Servidor temporariamente indisponível. Tente de novo.";
    }
  }
  return "Não foi possível carregar os anúncios.";
}

export type UltimosAnunciosSectionProps = {
  /** Quantidade máxima de cards exibidos. */
  max?: number;
  className?: string;
  /** IDs favoritados (home logada). */
  favoriteIds?: Set<string>;
  pendingFavoriteIds?: Set<string>;
  onToggleFavorite?: (id: ProdutoId) => void;
  /** Quando informado, favoritos deslogados redirecionam ao login. */
  loginHref?: string;
  /** Link do CTA inferior. */
  verTodosHref?: string;
  compact?: boolean;
  /** Iguala altura dos cards na grade (home pública). */
  uniformCards?: boolean;
};

const DEFAULT_MAX = 8;

const ULTIMOS_ANUNCIOS_SUBTITULO =
  "Confira os anúncios mais recentes e veja os detalhes sem criar conta.";

/** Grade responsiva — evita 2 colunas gigantes entre tablet e desktop. */
const VITRINE_GRID_BASE =
  "grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 md:grid-cols-3 md:gap-3 lg:grid-cols-4 lg:gap-3.5";

function vitrineGridClass(itemCount: number, uniformCards = false): string {
  const stretch = uniformCards ? "items-stretch" : "";
  if (itemCount <= 1) {
    return cn(
      "mx-auto grid max-w-[280px] grid-cols-1 gap-2.5 sm:max-w-xs",
      stretch,
    );
  }
  if (itemCount === 2) {
    return cn(`mx-auto max-w-lg ${VITRINE_GRID_BASE} lg:max-w-none`, stretch);
  }
  if (itemCount === 3) {
    return cn(`mx-auto max-w-3xl ${VITRINE_GRID_BASE} lg:max-w-none`, stretch);
  }
  return cn(VITRINE_GRID_BASE, stretch);
}

/**
 * Vitrine pública de produtos recentes — usada na home e na landing.
 */
export function UltimosAnunciosSection({
  max = DEFAULT_MAX,
  className,
  favoriteIds = new Set(),
  pendingFavoriteIds = new Set(),
  onToggleFavorite,
  loginHref,
  verTodosHref = "/produtos",
  compact = false,
  uniformCards = false,
}: UltimosAnunciosSectionProps) {
  const [items, setItems] = useState<ProdutoListaView[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setErrorMsg(null);
    void (async () => {
      try {
        const res = await listProdutos({
          ordenacao: "recentes",
          page: 1,
          page_size: max,
        });
        if (cancelled) return;
        const { items: list } = normalizeProdutosListResponseWithMeta(res.data);
        setItems(list.slice(0, max));
        setStatus("ready");
      } catch (e) {
        if (cancelled) return;
        setItems([]);
        setErrorMsg(friendlyError(e));
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [max]);

  const skeletonCount = Math.min(max, 8);
  const gridClass =
    status === "ready" && items.length > 0
      ? vitrineGridClass(items.length, uniformCards)
      : vitrineGridClass(skeletonCount, uniformCards);

  return (
    <section
      className={cn(
        "px-4 sm:px-5",
        compact ? "pb-3 pt-3 sm:pb-4 sm:pt-4" : "py-6 sm:py-8",
        className,
      )}
      aria-labelledby="ultimos-anuncios-heading"
    >
      <div className="mx-auto max-w-[1280px]">
        <div className={cn("text-center", compact ? "mb-2 sm:mb-3" : "mb-4 sm:mb-5")}>
          <h2
            id="ultimos-anuncios-heading"
            className="text-lg font-bold text-gray-900 sm:text-xl"
          >
            Últimos anúncios
          </h2>
          <p className="mx-auto mt-0.5 max-w-lg text-xs text-gray-500 sm:mt-1 sm:text-sm">
            {ULTIMOS_ANUNCIOS_SUBTITULO}
          </p>
        </div>

        {status === "loading" && (
          <div
            className={gridClass}
            aria-busy="true"
            aria-live="polite"
          >
            {Array.from({ length: skeletonCount }).map((_, i) => (
              <div
                key={i}
                className="min-h-[200px] animate-pulse rounded-xl border border-gray-100 bg-gray-100 sm:min-h-[240px]"
                aria-hidden
              />
            ))}
          </div>
        )}

        {status === "error" && errorMsg && (
          <p className="py-4 text-center text-sm text-slate-500" role="alert">
            {errorMsg}
          </p>
        )}

        {status === "ready" && items.length === 0 && (
          <div className="py-6 text-center">
            <p className="text-sm text-slate-500">
              Nenhum anúncio disponível no momento.
            </p>
            <Link
              to="/login?next=%2Fvender"
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#09bc8a]/30 px-3 py-1.5 text-sm font-semibold text-[#09bc8a] hover:bg-[#09bc8a]/5"
            >
              Vender minha bike
            </Link>
          </div>
        )}

        {status === "ready" && items.length > 0 && (
          <>
            <div className={gridClass}>
              {items.map((p) => {
                const href = `/produtos/${encodeURIComponent(String(p.id))}`;
                return (
                  <div
                    key={String(p.id)}
                    className={cn("min-w-0", uniformCards && "flex h-full")}
                  >
                    <ProdutoVitrineCard
                      produto={p}
                      href={href}
                      favoriteIds={favoriteIds}
                      pendingFavoriteIds={pendingFavoriteIds}
                      onToggleFavorite={onToggleFavorite ?? (() => {})}
                      loginHref={
                        loginHref !== undefined
                          ? loginHref
                          : onToggleFavorite
                            ? undefined
                            : `/login?next=${encodeURIComponent(href)}`
                      }
                    />
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex justify-center sm:mt-6">
              <Link
                to={verTodosHref}
                className="inline-flex items-center gap-2 rounded-lg bg-[#09bc8a] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#08a97c]"
              >
                Ver todos os anúncios
                <FaArrowRight className="size-3" aria-hidden />
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
