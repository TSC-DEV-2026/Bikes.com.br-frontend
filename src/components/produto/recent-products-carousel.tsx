import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { FaArrowRight } from "react-icons/fa6";
import { useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { listProdutos } from "@/api/endpoints/produtos.routes";
import { paths } from "@/api/endpoints/paths";
import { ProdutoVitrineCard } from "@/components/produto/produto-vitrine-card";
import { MARKETPLACE_SELL_CTA_HREF } from "@/lib/marketplace-quick-filters";
import { cn } from "@/lib/utils";
import type { ProdutoListaView } from "@/types/produto";
import { normalizeProdutosListResponseWithMeta } from "@/types/produto";

function friendlyError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (!err.response && err.code === "ERR_NETWORK") {
      return "Sem conexão. Verifique sua rede.";
    }
    if (err.response?.status && err.response.status >= 500) {
      return "Servidor temporariamente indisponível.";
    }
  }
  return "Não foi possível carregar os anúncios.";
}

export type RecentProductsCarouselProps = {
  max?: number;
  className?: string;
  /** Iguala altura dos cards na grade (home pública). */
  uniformCards?: boolean;
};

const DEFAULT_MAX = 10;

const DESTAQUE_SUBTITULO =
  "Os anúncios mais recentes do marketplace, prontos para você explorar.";

const CAROUSEL_ARROW_BASE_CLASS =
  "inline-flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-[#09bc8a] bg-white text-[#078f6f] opacity-100 shadow-md transition-[transform,colors,box-shadow] duration-200 hover:scale-105 hover:border-[#08a97c] hover:bg-[#ecfbf6] hover:text-[#056b52] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#09bc8a] focus-visible:ring-offset-2";

/** Centro visual na área dos cards (levemente acima do meio geométrico, próximo às imagens). */
const CAROUSEL_ARROW_VERTICAL_CLASS =
  "top-[42%] -translate-y-1/2 hover:-translate-y-1/2";

const SLIDE_TRANSITION_MS = 300;

const GRID_COLS_CLASS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
};

function chunkItems(
  items: ProdutoListaView[],
  perPage: number,
): ProdutoListaView[][] {
  const chunks: ProdutoListaView[][] = [];
  for (let i = 0; i < items.length; i += perPage) {
    chunks.push(items.slice(i, i + perPage));
  }
  return chunks;
}

/**
 * Cards por página conforme a largura do container do carrossel (não a janela).
 * Breakpoints calibrados para o container da home (~1280px max + padding).
 */
function cardsPerViewForWidth(width: number): number {
  if (width < 520) return 1;
  if (width < 768) return 2;
  if (width < 900) return 3;
  if (width < 1120) return 4;
  return 5;
}

function useCarouselViewport(measure: boolean) {
  const observerRef = useRef<ResizeObserver | null>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [cardsPerView, setCardsPerView] = useState(() =>
    typeof window !== "undefined" ? cardsPerViewForWidth(window.innerWidth) : 4,
  );

  const viewportRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (!node || !measure) return;

      const update = () => {
        const width = node.clientWidth;
        setViewportWidth(width);
        setCardsPerView(cardsPerViewForWidth(width));
      };

      update();
      const ro = new ResizeObserver(update);
      ro.observe(node);
      observerRef.current = ro;
    },
    [measure],
  );

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  return { viewportRef, viewportWidth, cardsPerView };
}

/** Altura do slide visível — evita centralizar setas na altura máxima de todas as páginas. */
function useActiveSlideHeight(measure: boolean) {
  const observerRef = useRef<ResizeObserver | null>(null);
  const [slideHeight, setSlideHeight] = useState(0);

  const activeSlideRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (!node || !measure) {
        setSlideHeight(0);
        return;
      }

      const update = () => {
        setSlideHeight(node.getBoundingClientRect().height);
      };

      update();
      const ro = new ResizeObserver(update);
      ro.observe(node);
      observerRef.current = ro;
    },
    [measure],
  );

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  return { activeSlideRef, slideHeight };
}

/** Grid da página: mesma densidade da vitrine (colunas fixas, não inflar cards na última página). */
function carouselPageGridClass(
  cardsPerView: number,
  itemCount: number,
  uniformCards = false,
): string {
  if (itemCount <= 1) {
    return cn(
      "mx-auto grid w-full max-w-[280px] grid-cols-1 gap-2.5 sm:max-w-xs sm:gap-3",
      uniformCards && "items-stretch",
    );
  }
  const cols = Math.max(1, cardsPerView);
  return cn(
    "grid w-full gap-2.5 sm:gap-3 lg:gap-3.5",
    GRID_COLS_CLASS[cols],
    uniformCards && "items-stretch",
  );
}

/**
 * Carrossel paginado de produtos recentes — GET /produtos?ordenacao=recentes.
 * Navegação por setas/dots, sem scrollbar horizontal.
 */
export function RecentProductsCarousel({
  max = DEFAULT_MAX,
  className,
  uniformCards = false,
}: RecentProductsCarouselProps) {
  const reducedMotion = useReducedMotion();
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<ProdutoListaView[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const measureCarousel =
    status === "loading" || (status === "ready" && items.length > 0);
  const { viewportRef, viewportWidth, cardsPerView } =
    useCarouselViewport(measureCarousel);
  const { activeSlideRef, slideHeight } = useActiveSlideHeight(
    status === "ready" && items.length > 0,
  );

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

  const effectivePerPage = Math.min(
    cardsPerView,
    Math.max(1, items.length || cardsPerView),
  );
  const totalPages =
    items.length > 0 ? Math.ceil(items.length / effectivePerPage) : 1;
  const maxPageIndex = Math.max(0, totalPages - 1);
  const currentPage = Math.min(page, maxPageIndex);

  useEffect(() => {
    setPage(0);
  }, [effectivePerPage, items.length]);

  useEffect(() => {
    setPage((p) => Math.min(p, maxPageIndex));
  }, [maxPageIndex]);

  const pages = useMemo(
    () => chunkItems(items, effectivePerPage),
    [items, effectivePerPage],
  );
  const showNav = totalPages > 1;
  const canGoPrev = showNav && currentPage > 0;
  const canGoNext = showNav && currentPage < maxPageIndex;

  const trackOffsetPx =
    viewportWidth > 0 ? currentPage * viewportWidth : 0;

  const skeletonCount = Math.min(max, effectivePerPage);

  return (
    <section
      className={cn("w-full min-w-0", className)}
      aria-labelledby="recent-products-heading"
      aria-roledescription="carrossel"
    >
      <div className="mb-2 flex items-start justify-between gap-3 sm:mb-3">
        <div className="min-w-0 overflow-visible">
          <p className="text-[0.65rem] font-bold uppercase leading-normal tracking-wide text-[#09bc8a] sm:text-xs">
            Postados recentemente
          </p>
          <h2
            id="recent-products-heading"
            className="text-base font-black text-[#0c1b33] sm:text-lg"
          >
            Anúncios em destaque
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
            {DESTAQUE_SUBTITULO}
          </p>
        </div>
        <Link
          to={paths.produtos()}
          className="hidden shrink-0 items-center gap-1 text-xs font-bold text-[#078f6f] hover:underline sm:inline-flex sm:text-sm"
        >
          Ver todos
          <FaArrowRight className="size-3" aria-hidden />
        </Link>
      </div>

      {status === "loading" && (
        <div
          ref={viewportRef}
          className={carouselPageGridClass(
            effectivePerPage,
            skeletonCount,
            uniformCards,
          )}
          aria-busy="true"
          aria-live="polite"
        >
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <div
              key={i}
              className="min-h-[200px] animate-pulse rounded-xl border border-slate-100 bg-slate-100 sm:min-h-[240px]"
              aria-hidden
            />
          ))}
        </div>
      )}

      {status === "error" && errorMsg && (
        <p className="text-sm text-slate-500" role="alert">
          {errorMsg}
        </p>
      )}

      {status === "ready" && items.length === 0 && (
        <div className="rounded-xl border border-slate-200/80 bg-slate-50 px-4 py-8 text-center">
          <p className="text-sm text-slate-600">
            Nenhum anúncio disponível no momento.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <Link
              to={paths.produtos()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#09bc8a] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#08a97c]"
            >
              Ver todos os anúncios
              <FaArrowRight className="size-3" aria-hidden />
            </Link>
            <Link
              to={MARKETPLACE_SELL_CTA_HREF}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#09bc8a]/30 px-4 py-2.5 text-sm font-bold text-[#078f6f] transition hover:bg-[#09bc8a]/5"
            >
              Anunciar produto
            </Link>
          </div>
        </div>
      )}

      {status === "ready" && items.length > 0 && (
        <>
          <div className="carouselCardsArea relative w-full min-w-0 overflow-visible">
            <div
              ref={viewportRef}
              className="carouselViewport w-full min-w-0 overflow-hidden"
              aria-live="polite"
            >
              <div
                className={cn(
                  "flex will-change-transform",
                  !reducedMotion &&
                    "transition-transform duration-300 ease-in-out motion-reduce:transition-none",
                )}
                style={{
                  transform:
                    viewportWidth > 0
                      ? `translate3d(-${trackOffsetPx}px, 0, 0)`
                      : undefined,
                  transitionDuration: reducedMotion
                    ? undefined
                    : `${SLIDE_TRANSITION_MS}ms`,
                }}
              >
                {pages.map((pageItems, pageIndex) => (
                  <div
                    key={pageIndex}
                    ref={
                      pageIndex === currentPage ? activeSlideRef : undefined
                    }
                    className="box-border shrink-0 grow-0"
                    style={{
                      width:
                        viewportWidth > 0 ? `${viewportWidth}px` : "100%",
                    }}
                    aria-hidden={pageIndex !== currentPage}
                  >
                    <div
                      className={carouselPageGridClass(
                        effectivePerPage,
                        pageItems.length,
                        uniformCards,
                      )}
                    >
                      {pageItems.map((p) => {
                        const href = `/produtos/${encodeURIComponent(String(p.id))}`;
                        return (
                          <div
                            key={String(p.id)}
                            className={cn(
                              "min-w-0",
                              uniformCards && "flex h-full",
                            )}
                          >
                            <ProdutoVitrineCard
                              produto={p}
                              href={href}
                              favoriteIds={new Set()}
                              pendingFavoriteIds={new Set()}
                              onToggleFavorite={() => {}}
                              loginHref={`/login?next=${encodeURIComponent(href)}`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              className={cn(
                "carouselControlsLayer pointer-events-none absolute top-0 z-20 hidden sm:block",
                slideHeight > 0 ? "left-0 right-0" : "inset-0",
              )}
              style={
                slideHeight > 0 ? { height: slideHeight } : undefined
              }
              aria-hidden={!canGoPrev && !canGoNext}
            >
              {canGoPrev ? (
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className={cn(
                    CAROUSEL_ARROW_BASE_CLASS,
                    CAROUSEL_ARROW_VERTICAL_CLASS,
                    "pointer-events-auto absolute left-0 -translate-x-1/2 hover:-translate-x-1/2",
                  )}
                  aria-label="Anúncios anteriores"
                >
                  <ChevronLeft className="size-4" aria-hidden />
                </button>
              ) : null}

              {canGoNext ? (
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(maxPageIndex, p + 1))}
                  className={cn(
                    CAROUSEL_ARROW_BASE_CLASS,
                    CAROUSEL_ARROW_VERTICAL_CLASS,
                    "pointer-events-auto absolute right-0 translate-x-1/2 hover:translate-x-1/2",
                  )}
                  aria-label="Próximos anúncios"
                >
                  <ChevronRight className="size-4" aria-hidden />
                </button>
              ) : null}
            </div>
          </div>

          {showNav ? (
            <div
              className="mt-3 flex justify-center gap-1.5"
              role="tablist"
              aria-label="Páginas do carrossel"
            >
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === currentPage}
                  aria-label={`Página ${i + 1} de ${totalPages}`}
                  onClick={() => setPage(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === currentPage
                      ? "w-5 bg-[#09bc8a]"
                      : "w-1.5 bg-slate-300 hover:bg-slate-400",
                  )}
                />
              ))}
            </div>
          ) : null}

          <div className="mt-4 flex justify-center sm:mt-5">
            <Link
              to={paths.produtos()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#09bc8a]/30 px-4 py-2 text-sm font-bold text-[#078f6f] transition hover:bg-[#09bc8a]/5 sm:hidden"
            >
              Ver todos os anúncios
              <FaArrowRight className="size-3" aria-hidden />
            </Link>
            <Link
              to={paths.produtos()}
              className="hidden items-center gap-2 rounded-lg bg-[#09bc8a] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#08a97c] sm:inline-flex"
            >
              Ver todos os anúncios
              <FaArrowRight className="size-3" aria-hidden />
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
