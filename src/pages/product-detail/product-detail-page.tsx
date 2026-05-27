import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Heart,
  Loader2,
  RotateCcw,
  ShoppingCart,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import {
  addFavorito,
  listFavoritos,
  removeFavorito,
} from "@/api/endpoints/favoritos.routes";
import { categoriasRoutes, marcasRoutes, paths, vendedoresRoutes } from "@/api/endpoints";
import {
  getProdutoById,
  listProdutoAvaliacoes,
  listProdutoPerguntas,
} from "@/api/endpoints/produtos.routes";
import { useAuth } from "@/contexts/auth-context";
import { useCart } from "@/contexts/cart-context";
import { useFavoritesCount } from "@/contexts/favorites-count-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  buildProdutoSellerEditFormValues,
  extractCategoriaMarcaLabels,
  extractVendedorIdFromProdutoPayload,
  normalizeAvaliacoesResponse,
  normalizePerguntasResponse,
  formatProdutoCondicaoLabel,
  normalizeProdutoDetalhe,
  type AvaliacaoView,
  type PerguntaView,
  type ProdutoDetalheView,
  type ProdutoIndexadorView,
} from "@/types/produto";
import { parseVendedor, type Vendedor } from "@/types/vendedor";
import { VenderProdutoPreviewToolbar } from "@/pages/vender/vender-produto-preview-toolbar";
import {
  enrichMarcaNaResolucao,
  resolveProdutoCategoriaMarca,
  type ProdutoCategoriaMarcaResolvida,
} from "@/pages/vender/vender-produto-editor-utils";
import { notifyInfo, notifySuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { favoriteIdsFromListPayload } from "@/types/favorito";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import type { Components } from "react-markdown";

/** Só aceita caminho relativo interno (evita open-redirect). */
function safeReturnPathFromState(state: unknown): string | null {
  if (state == null || typeof state !== "object") return null;
  const from = (state as { from?: unknown }).from;
  if (
    typeof from !== "string" ||
    !from.startsWith("/") ||
    from.startsWith("//")
  ) {
    return null;
  }
  return from;
}

function formatBrlFromSellerInput(raw: string): string | null {
  const t = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return null;
  }
}

const CARACTERISTICAS_COLLAPSE_AT = 12;

/** Lightbox (visualizador de imagem em tela cheia) */
const LB_ZOOM_MIN = 1;
const LB_ZOOM_MAX = 4;
const LB_ZOOM_STEP = 0.25;
/** Passo do zoom pela roda do mouse (desktop). */
const LB_WHEEL_STEP = 0.12;

function clampLbPan(x: number, y: number, scale: number) {
  const lim = 360 * Math.max(0, scale - 1);
  return {
    x: Math.max(-lim, Math.min(lim, x)),
    y: Math.max(-lim, Math.min(lim, y)),
  };
}

/** Markdown seguro (sem HTML bruto); estilo alinhado ao card de descrição. */
const PRODUTO_DESCRICAO_MARKDOWN_COMPONENTS: Partial<Components> = {
  h1: ({ children, ...props }) => (
    <h3
      className="mb-2 mt-6 text-base font-bold tracking-tight text-foreground first:mt-0"
      {...props}
    >
      {children}
    </h3>
  ),
  h2: ({ children, ...props }) => (
    <h3
      className="mb-2 mt-5 text-base font-bold tracking-tight text-foreground first:mt-0"
      {...props}
    >
      {children}
    </h3>
  ),
  h3: ({ children, ...props }) => (
    <h3
      className="mb-2 mt-4 text-sm font-bold tracking-tight text-foreground first:mt-0"
      {...props}
    >
      {children}
    </h3>
  ),
  p: ({ children, ...props }) => (
    <p className="mb-3 leading-relaxed last:mb-0" {...props}>
      {children}
    </p>
  ),
  strong: ({ children, ...props }) => (
    <strong className="font-semibold text-foreground" {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }) => (
    <em className="italic text-foreground/90" {...props}>
      {children}
    </em>
  ),
  ul: ({ children, ...props }) => (
    <ul
      className="my-3 list-outside list-disc space-y-1.5 pl-4 marker:text-muted-foreground [&>li>p]:m-0 [&>li>p]:inline"
      {...props}
    >
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol
      className="my-3 list-outside list-decimal space-y-1.5 pl-4 marker:text-muted-foreground [&>li>p]:m-0 [&>li>p]:inline"
      {...props}
    >
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="leading-relaxed [&>p+p]:mt-2 [&>p+p]:block" {...props}>
      {children}
    </li>
  ),
  a: ({ href, children, ...props }) => (
    <a
      href={href}
      className="font-medium text-primary underline underline-offset-2 hover:no-underline"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  ),
  hr: ({ ...props }) => <hr className="my-6 border-border" {...props} />,
  blockquote: ({ children, ...props }) => (
    <blockquote
      className="my-3 border-l-2 border-primary/35 py-0.5 pl-3 text-muted-foreground"
      {...props}
    >
      {children}
    </blockquote>
  ),
};

function humanizeTituloGrupoIndexador(campoChave: string): string {
  const k = campoChave.trim().toLowerCase();
  if (k === "" || k === "geral") return "Características";
  return campoChave
    .replace(/_/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

/** Rótulo exibido na coluna “campo” (inclui `geral` quando a API envia assim). */
function rotuloCelulaCampo(item: ProdutoIndexadorView): string {
  const c = item.campo.trim();
  if (!c) return "";
  return c
    .replace(/_/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

type IndexadorGrupo = {
  key: string;
  titulo: string;
  rows: ProdutoIndexadorView[];
};

function buildIndexadorGrupos(items: ProdutoIndexadorView[]): IndexadorGrupo[] {
  const keyFor = (it: ProdutoIndexadorView) =>
    (it.campo.trim() || "geral").toLowerCase();
  const order: string[] = [];
  const map = new Map<string, ProdutoIndexadorView[]>();
  for (const it of items) {
    const k = keyFor(it);
    if (!map.has(k)) {
      order.push(k);
      map.set(k, []);
    }
    map.get(k)!.push(it);
  }
  return order.map((key) => ({
    key,
    titulo: humanizeTituloGrupoIndexador(key),
    rows: map.get(key)!,
  }));
}

function usarSubsecoesIndexador(grupos: IndexadorGrupo[]): boolean {
  return grupos.some((g) => g.rows.length > 1);
}

function CaracteristicasProdutoTabela({ items }: { items: ProdutoIndexadorView[] }) {
  const [expanded, setExpanded] = useState(false);
  const needToggle = items.length > CARACTERISTICAS_COLLAPSE_AT;
  const { visiveis, grupos } = useMemo(() => {
    const v =
      !needToggle || expanded ? items : items.slice(0, CARACTERISTICAS_COLLAPSE_AT);
    return { visiveis: v, grupos: buildIndexadorGrupos(v) };
  }, [items, expanded]);
  const subsecoes = usarSubsecoesIndexador(grupos);

  const rowLiClass = (i: number) => {
    const zebra = i % 2 === 0 ? "bg-slate-50" : "bg-white";
    return `${zebra} grid grid-cols-1 gap-1 px-4 py-2.5 text-sm sm:grid-cols-[minmax(9rem,38%)_minmax(0,1fr)] sm:items-center sm:gap-x-4`;
  };

  return (
    <div className="space-y-8">
      {subsecoes ? (
        grupos.map((grupo) => (
          <div key={grupo.key} className="space-y-3">
            <h3 className="text-base font-semibold text-foreground">
              {grupo.titulo}
            </h3>
            <div className="overflow-hidden rounded-lg border border-border">
              <ul className="divide-y divide-border" role="list">
                {grupo.rows.map((row, i) => (
                  <li
                    key={`${row.campo}-${row.valor}-${i}`}
                    className={rowLiClass(i)}
                  >
                    <span className="min-w-0 font-semibold text-foreground">
                      {rotuloCelulaCampo(row) || "—"}
                    </span>
                    <span className="min-w-0 text-muted-foreground sm:text-right">
                      {row.valor}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <ul className="divide-y divide-border" role="list">
            {visiveis.map((row, i) => (
              <li
                key={`${row.campo}-${row.valor}-${i}`}
                className={rowLiClass(i)}
              >
                <span className="min-w-0 font-semibold text-foreground">
                  {rotuloCelulaCampo(row) || "—"}
                </span>
                <span className="min-w-0 text-muted-foreground sm:text-right">
                  {row.valor}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {needToggle && (
        <button
          type="button"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
        >
          {expanded ? "Mostrar menos" : "Conferir todas as características"}
          <ChevronDown
            className={`size-4 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
      )}
    </div>
  );
}

function friendlyProdutoError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    if (status === 404)
      return "Este produto não foi encontrado ou não está mais disponível.";
    if (status && status >= 500)
      return "Servidor temporariamente indisponível. Tente de novo mais tarde.";
    if (!err.response && err.code === "ERR_NETWORK")
      return "Não foi possível conectar ao servidor. Verifique sua rede e a URL da API.";
  }
  return "Não foi possível carregar este produto. Tente novamente.";
}

function DetalheSkeleton() {
  return (
    <div
      className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-2xl border bg-white px-6 py-12 text-center shadow-sm"
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <Loader2 className="size-10 animate-spin text-[#09bc8a]" aria-hidden />
      <div>
        <p className="text-lg font-bold text-foreground">
          Carregando produto...
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Buscando detalhes, imagens e informações do anúncio.
        </p>
      </div>
      <span className="sr-only">Carregando produto</span>
    </div>
  );
}

type ExtraSection<T> = { status: "idle" | "loading" | "ok"; rows: T[] };

export type ProductDetailMode = "public" | "seller-preview";

export type ProductDetailPageProps = {
  mode?: ProductDetailMode;
};

export default function ProductDetailPage({ mode = "public" }: ProductDetailPageProps) {
  const { id: rawId } = useParams<{ id: string }>();
  const id = rawId?.trim() ?? "";
  const location = useLocation();
  const navigate = useNavigate();
  const isSellerPreview = mode === "seller-preview";
  const { bootstrapped, isAuthenticated } = useAuth();
  const { refreshFavoriteCount } = useFavoritesCount();
  const { addItemToCart, addPending } = useCart();

  const [produto, setProduto] = useState<ProdutoDetalheView | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [perguntas, setPerguntas] = useState<ExtraSection<PerguntaView>>({
    status: "idle",
    rows: [],
  });
  /** Índice da pergunta com resposta visível (accordion: uma por vez). */
  const [perguntaAbertaIdx, setPerguntaAbertaIdx] = useState<number | null>(
    null,
  );
  const [avaliacoes, setAvaliacoes] = useState<ExtraSection<AvaliacaoView>>({
    status: "idle",
    rows: [],
  });

  const [galleryIndex, setGalleryIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lbScale, setLbScale] = useState(1);
  const [lbPan, setLbPan] = useState({ x: 0, y: 0 });
  const lbScaleRef = useRef(lbScale);
  const lbPanRef = useRef(lbPan);
  const lightboxRootRef = useRef<HTMLDivElement | null>(null);
  const heroImageTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [lbDragging, setLbDragging] = useState(false);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchLastRef = useRef<{ x: number; y: number } | null>(null);
  const touchLockedRef = useRef(false);
  const [swipeOffsetX, setSwipeOffsetX] = useState(0);
  const [swipeTransition, setSwipeTransition] = useState(false);

  const lbPanDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const lbLastTapRef = useRef(0);

  const [isFavorite, setIsFavorite] = useState<boolean | null>(null);
  const [favActionPending, setFavActionPending] = useState(false);
  const [favMessage, setFavMessage] = useState<string | null>(null);
  const [cartMessage, setCartMessage] = useState<string | null>(null);

  const [rawProductPayload, setRawProductPayload] = useState<unknown | null>(null);
  const [meVendedor, setMeVendedor] = useState<Vendedor | null>(null);
  const [sellerMeLoading, setSellerMeLoading] = useState(isSellerPreview);
  const [sellerMeError, setSellerMeError] = useState<string | null>(null);
  const [sellerOwnershipOk, setSellerOwnershipOk] = useState(() => !isSellerPreview);
  const [sellerCatalogMeta, setSellerCatalogMeta] = useState<{
    loading: boolean;
    error: string | null;
    resolved: ProdutoCategoriaMarcaResolvida | null;
  }>({ loading: false, error: null, resolved: null });

  const blockedSellerAccount = meVendedor?.status?.toLowerCase() === "blocked";

  const loginNextHref = `/login?next=${encodeURIComponent(`${location.pathname}${location.search}`)}`;

  const productBackTo = useMemo(() => {
    if (isSellerPreview) return paths.minhaLoja();
    const from = safeReturnPathFromState(location.state);
    if (from) return from;
    return isAuthenticated ? "/home" : "/";
  }, [isSellerPreview, location.state, isAuthenticated]);

  const handleProductBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(productBackTo);
  }, [navigate, productBackTo]);

  useEffect(() => {
    setGalleryIndex(0);
    setLightboxOpen(false);
    setLightboxIndex(0);
    setSwipeOffsetX(0);
    setSwipeTransition(false);
    setLbScale(1);
    setLbPan({ x: 0, y: 0 });
    setLbDragging(false);
    lbPanDragRef.current = null;
    setPerguntaAbertaIdx(null);
  }, [id]);

  useEffect(() => {
    if (!isSellerPreview) return;
    setSellerOwnershipOk(false);
    setRawProductPayload(null);
    setSellerMeError(null);
    setSellerCatalogMeta({ loading: false, error: null, resolved: null });
  }, [id, isSellerPreview]);

  useEffect(() => {
    if (!isSellerPreview) return;
    if (!bootstrapped || !id) return;
    if (!isAuthenticated) {
      const nextHref = `/login?next=${encodeURIComponent(`${location.pathname}${location.search}`)}`;
      navigate(nextHref, { replace: true });
    }
  }, [
    bootstrapped,
    id,
    isAuthenticated,
    isSellerPreview,
    location.pathname,
    location.search,
    navigate,
  ]);

  useEffect(() => {
    if (!isSellerPreview || !bootstrapped || !isAuthenticated) return;
    let cancelled = false;
    setSellerMeLoading(true);
    setSellerMeError(null);
    void (async () => {
      try {
        const res = await vendedoresRoutes.getMeuVendedor();
        if (cancelled) return;
        if (res.status === 404) {
          navigate(paths.minhaLoja(), { replace: true });
          return;
        }
        if (!res.ok || res.status !== 200) {
          setMeVendedor(null);
          setSellerMeError(
            `Não foi possível confirmar sua loja (${res.status}). Tente novamente mais tarde.`,
          );
          return;
        }
        const v = parseVendedor(res.data);
        if (!v) {
          setSellerMeError("Os dados da loja chegaram em um formato não reconhecido.");
          setMeVendedor(null);
          return;
        }
        setMeVendedor(v);
      } catch {
        if (!cancelled) {
          setSellerMeError("Não foi possível carregar os dados da sua loja.");
          setMeVendedor(null);
        }
      } finally {
        if (!cancelled) setSellerMeLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bootstrapped, isAuthenticated, isSellerPreview, navigate]);

  useEffect(() => {
    if (!isSellerPreview) return;
    if (!id || loading) return;
    if (errorMsg || !produto) {
      setSellerOwnershipOk(false);
      return;
    }
    if (!meVendedor || sellerMeLoading) return;
    const vid = extractVendedorIdFromProdutoPayload(rawProductPayload);
    if (vid == null || vid !== meVendedor.id) {
      navigate(`/produtos/${encodeURIComponent(id)}`, { replace: true });
      return;
    }
    setSellerOwnershipOk(true);
  }, [
    loading,
    errorMsg,
    id,
    rawProductPayload,
    isSellerPreview,
    meVendedor,
    navigate,
    produto,
    sellerMeLoading,
  ]);

  useEffect(() => {
    if (!isSellerPreview || !sellerOwnershipOk || !rawProductPayload) {
      setSellerCatalogMeta({ loading: false, error: null, resolved: null });
      return;
    }
    let cancelled = false;
    setSellerCatalogMeta({ loading: true, error: null, resolved: null });
    void (async () => {
      try {
        const [pais, subs, marcas] = await Promise.all([
          categoriasRoutes.getCategoriasPai(),
          categoriasRoutes.getMinhasSubcategorias(),
          marcasRoutes.getMarcas(),
        ]);
        if (cancelled) return;
        const baseResolved = resolveProdutoCategoriaMarca(
          rawProductPayload,
          pais,
          subs,
          marcas,
        );
        const resolved = await enrichMarcaNaResolucao(
          baseResolved,
          rawProductPayload,
          marcas,
        );
        if (cancelled) return;
        setSellerCatalogMeta({ loading: false, error: null, resolved });
      } catch {
        if (!cancelled) {
          setSellerCatalogMeta({
            loading: false,
            error: "Não foi possível carregar categoria e marca.",
            resolved: null,
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSellerPreview, sellerOwnershipOk, rawProductPayload]);

  const lightboxImageCount = produto?.imagens.length ?? 0;

  const resetLightboxTransform = useCallback(() => {
    setLbScale(1);
    setLbPan({ x: 0, y: 0 });
    setLbDragging(false);
    lbPanDragRef.current = null;
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    setSwipeOffsetX(0);
    setSwipeTransition(false);
    resetLightboxTransform();
    requestAnimationFrame(() => {
      heroImageTriggerRef.current?.blur();
      const active = document.activeElement;
      if (active instanceof HTMLElement) {
        active.blur();
      }
    });
  }, [resetLightboxTransform]);

  useEffect(() => {
    if (!lightboxOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeLightbox();
        return;
      }

      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        setLbScale((s) =>
          Math.min(LB_ZOOM_MAX, Number((s + LB_ZOOM_STEP).toFixed(2))),
        );
        return;
      }

      if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        setLbScale((s) =>
          Math.max(LB_ZOOM_MIN, Number((s - LB_ZOOM_STEP).toFixed(2))),
        );
        return;
      }

      if (lightboxImageCount <= 1) return;

      if (event.key === "ArrowRight") {
        resetLightboxTransform();
        setLightboxIndex((current) => (current + 1) % lightboxImageCount);
      }

      if (event.key === "ArrowLeft") {
        resetLightboxTransform();
        setLightboxIndex((current) =>
          current === 0 ? lightboxImageCount - 1 : current - 1,
        );
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [lightboxOpen, lightboxImageCount, closeLightbox, resetLightboxTransform]);

  useEffect(() => {
    setLbPan((p) => clampLbPan(p.x, p.y, lbScale));
  }, [lbScale]);

  useLayoutEffect(() => {
    if (!lightboxOpen) return;
    const node = lightboxRootRef.current;
    if (!node) return;

    const onWheelDom = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const scale = lbScaleRef.current;
      const pan = lbPanRef.current;
      const delta = e.deltaY > 0 ? -LB_WHEEL_STEP : LB_WHEEL_STEP;
      const nextScale = Number(
        Math.min(
          LB_ZOOM_MAX,
          Math.max(LB_ZOOM_MIN, scale + delta),
        ).toFixed(4),
      );

      if (Math.abs(nextScale - scale) < 1e-9) return;

      const rect = node.getBoundingClientRect();
      const focalX = e.clientX - rect.left - rect.width / 2;
      const focalY = e.clientY - rect.top - rect.height / 2;

      if (nextScale <= LB_ZOOM_MIN) {
        setLbScale(LB_ZOOM_MIN);
        setLbPan({ x: 0, y: 0 });
        return;
      }

      const ratio = nextScale / scale;
      const nx = focalX - (focalX - pan.x) * ratio;
      const ny = focalY - (focalY - pan.y) * ratio;
      setLbScale(nextScale);
      setLbPan(clampLbPan(nx, ny, nextScale));
    };

    node.addEventListener("wheel", onWheelDom, { passive: false });
    return () => node.removeEventListener("wheel", onWheelDom);
  }, [lightboxOpen]);

  useEffect(() => {
    if (isSellerPreview || !bootstrapped || !isAuthenticated || !produto || !id) {
      setIsFavorite(null);
      return;
    }
    let cancelled = false;
    setIsFavorite(null);
    void (async () => {
      try {
        const res = await listFavoritos();
        if (cancelled) return;
        if (!res.ok) {
          setIsFavorite(false);
          return;
        }
        const ids = favoriteIdsFromListPayload(res.data);
        setIsFavorite(ids.has(String(produto.id)));
      } catch {
        if (!cancelled) setIsFavorite(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bootstrapped, isAuthenticated, produto, id, isSellerPreview]);

  const handleAddToCart = () => {
    if (!produto || !isAuthenticated || addPending) return;
    setCartMessage(null);
    void (async () => {
      const result = await addItemToCart(produto.id, 1);
      if (result.ok) {
        notifySuccess("Produto adicionado ao carrinho.");
      } else {
        setCartMessage(result.message);
      }
    })();
  };

  const handleBuyPlaceholder = () => {
    notifyInfo("Pagamento em breve", "Estamos preparando o checkout.");
  };

  const handleToggleFavorite = () => {
    if (!produto || !isAuthenticated || favActionPending) return;
    setFavMessage(null);
    setFavActionPending(true);
    void (async () => {
      try {
        const shouldRemove = isFavorite === true;
        if (shouldRemove) {
          await removeFavorito(produto.id);
          setIsFavorite(false);
        } else {
          await addFavorito(produto.id);
          setIsFavorite(true);
        }
        void refreshFavoriteCount();
      } catch {
        setFavMessage("Não foi possível atualizar favoritos. Tente de novo.");
        try {
          const res = await listFavoritos();
          if (res.ok) {
            const ids = favoriteIdsFromListPayload(res.data);
            setIsFavorite(ids.has(String(produto.id)));
          } else {
            setIsFavorite(false);
          }
        } catch {
          setIsFavorite(false);
        }
      } finally {
        setFavActionPending(false);
      }
    })();
  };

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setProduto(null);
      setErrorMsg("Nenhum produto foi especificado.");
      return;
    }

    let cancelled = false;
    async function loadProduto() {
      setLoading(true);
      setErrorMsg(null);
      setProduto(null);
      try {
        const res = await getProdutoById(id);
        if (cancelled) return;
        const normalized = normalizeProdutoDetalhe(id, res.data);
        if (!normalized) {
          setErrorMsg(
            "Os dados deste produto chegaram em um formato não reconhecido.",
          );
          setProduto(null);
          setRawProductPayload(null);
        } else {
          setProduto(normalized);
          setRawProductPayload(res.data);
        }
      } catch (e) {
        if (!cancelled) {
          setProduto(null);
          setRawProductPayload(null);
          setErrorMsg(friendlyProdutoError(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadProduto();

    return () => {
      cancelled = true;
    };
  }, [id, isSellerPreview]);

  useEffect(() => {
    if (!id) return;

    setPerguntas({ status: "loading", rows: [] });

    let cancelled = false;
    listProdutoPerguntas(id)
      .then((res) => {
        if (cancelled) return;
        setPerguntas({
          status: "ok",
          rows: normalizePerguntasResponse(res.data),
        });
      })
      .catch(() => {
        if (cancelled) return;
        setPerguntas({ status: "idle", rows: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;

    setAvaliacoes({ status: "loading", rows: [] });

    let cancelled = false;
    listProdutoAvaliacoes(id)
      .then((res) => {
        if (cancelled) return;
        setAvaliacoes({
          status: "ok",
          rows: normalizeAvaliacoesResponse(res.data),
        });
      })
      .catch(() => {
        if (cancelled) return;
        setAvaliacoes({ status: "idle", rows: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const reloadProduto = () => {
    if (!id) return;
    void (async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await getProdutoById(id);
        const normalized = normalizeProdutoDetalhe(id, res.data);
        if (!normalized) {
          setErrorMsg(
            "Os dados deste produto chegaram em um formato não reconhecido.",
          );
          setProduto(null);
          setRawProductPayload(null);
        } else {
          setProduto(normalized);
          setRawProductPayload(res.data);
        }
      } catch (e) {
        setProduto(null);
        setRawProductPayload(null);
        setErrorMsg(friendlyProdutoError(e));
      } finally {
        setLoading(false);
      }
    })();
  };

  const productImages = produto?.imagens ?? [];
  const heroSrc = productImages[galleryIndex] ?? null;
  const lightboxSrc = productImages[lightboxIndex] ?? null;

  const openLightbox = (index: number) => {
    resetLightboxTransform();
    setLightboxIndex(index);
    setSwipeOffsetX(0);
    setSwipeTransition(false);
    setLightboxOpen(true);
  };

  const goToLightboxImage = (index: number) => {
    resetLightboxTransform();
    setLightboxIndex(index);
    setSwipeOffsetX(0);
    setSwipeTransition(false);
  };

  const goToPreviousLightboxImage = () => {
    if (lightboxImageCount <= 1) return;
    resetLightboxTransform();
    setLightboxIndex((current) =>
      current === 0 ? lightboxImageCount - 1 : current - 1,
    );
    setSwipeOffsetX(0);
    setSwipeTransition(false);
  };

  const goToNextLightboxImage = () => {
    if (lightboxImageCount <= 1) return;
    resetLightboxTransform();
    setLightboxIndex((current) => (current + 1) % lightboxImageCount);
    setSwipeOffsetX(0);
    setSwipeTransition(false);
  };

  const toggleLbDoubleZoom = useCallback(() => {
    setLbScale((s) => (s === 1 ? 2 : 1));
    setLbPan({ x: 0, y: 0 });
  }, []);

  const handleLbImageTouchEnd = useCallback(() => {
    if (lbScale > 1) return;
    const now = Date.now();
    if (now - lbLastTapRef.current < 320) {
      lbLastTapRef.current = 0;
      toggleLbDoubleZoom();
    } else {
      lbLastTapRef.current = now;
    }
  }, [lbScale, toggleLbDoubleZoom]);

  const handleLbPanPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (lbScale <= 1) return;
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      lbPanDragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originX: lbPan.x,
        originY: lbPan.y,
      };
      setLbDragging(true);
    },
    [lbScale, lbPan.x, lbPan.y],
  );

  const handleLbPanPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const d = lbPanDragRef.current;
      if (!d || d.pointerId !== e.pointerId) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      setLbPan(clampLbPan(d.originX + dx, d.originY + dy, lbScale));
    },
    [lbScale],
  );

  const handleLbPanPointerUp = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const d = lbPanDragRef.current;
      if (!d || d.pointerId !== e.pointerId) return;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      lbPanDragRef.current = null;
      setLbDragging(false);
    },
    [],
  );

  const showPerguntasBlock = perguntas.status === "ok";
  const showAvaliacoesBlock = avaliacoes.status === "ok";

  lbScaleRef.current = lbScale;
  lbPanRef.current = lbPan;

  const showBlockingSkeleton =
    Boolean(id) &&
    !sellerMeError &&
    (loading ||
      (isSellerPreview &&
        (sellerMeLoading || (!errorMsg && !!produto && !!meVendedor && !sellerOwnershipOk))));

  const showProdutoDetalhe =
    Boolean(id) &&
    !loading &&
    !errorMsg &&
    !!produto &&
    (!isSellerPreview || sellerOwnershipOk);

  const sellerPreviewAtivo = useMemo(() => {
    if (!isSellerPreview || !produto || !rawProductPayload) return null;
    return buildProdutoSellerEditFormValues(produto, rawProductPayload).ativo;
  }, [isSellerPreview, produto, rawProductPayload]);

  const sellerPromoTexto = useMemo(() => {
    if (!isSellerPreview || !produto || !rawProductPayload) return null;
    const form = buildProdutoSellerEditFormValues(produto, rawProductPayload);
    if (!form.preco_promocional.trim()) return null;
    return (
      formatBrlFromSellerInput(form.preco_promocional) ?? form.preco_promocional
    );
  }, [isSellerPreview, produto, rawProductPayload]);



  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-clip bg-background">
      <Header />
      <main className="mx-auto flex w-full min-w-0 max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="flex flex-wrap items-center gap-2  pt-16">
          <Button
            type="button"
            variant="outline"
            className="-ml-2 gap-2 px-3 font-semibold text-foreground  hover:text-foreground"
            onClick={handleProductBack}
            aria-label={`Voltar (${location.pathname}${location.search})`}
            title={isSellerPreview ? "Voltar para Minha loja" : "Voltar"}
          >
            <ArrowLeft className="size-4" aria-hidden />
            {isSellerPreview ? "Minha loja" : "Voltar"}
          </Button>
        </div>

        {isSellerPreview && sellerMeError ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader>
              <CardTitle>Não foi possível validar sua loja</CardTitle>
              <CardDescription>{sellerMeError}</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button type="button" variant="secondary" asChild>
                <Link to={paths.minhaLoja()}>Ir para Minha loja</Link>
              </Button>
            </CardFooter>
          </Card>
        ) : null}

        {isSellerPreview && sellerOwnershipOk && meVendedor ? (
          <VenderProdutoPreviewToolbar
            produtoId={produto?.id ?? id}
            lojaAtiva={meVendedor.ativo}
            editDisabled={blockedSellerAccount}
          />
        ) : null}

        {!id && (
          <Card>
            <CardHeader>
              <CardTitle>Não encontrado</CardTitle>
              <CardDescription>
                Este link não inclui um identificador de produto válido.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link to="/produtos">Ir para lista de produtos</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {id && showBlockingSkeleton && <DetalheSkeleton />}

        {id && !loading && errorMsg && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader>
              <CardTitle>Não foi possível exibir este produto</CardTitle>
              <CardDescription>{errorMsg}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => reloadProduto()}
              >
                Tentar novamente
              </Button>
              <Button variant="outline" asChild>
                <Link to="/produtos">Ver outros produtos</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        
        {showProdutoDetalhe && produto ? (
          <>
            <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,420px)] lg:items-start">
              <div className="min-w-0 space-y-4 self-start">
                <div className="flex h-64 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:h-72 sm:p-4 md:h-80 lg:h-[420px]">
                  {heroSrc ? (
                    <button
                      ref={heroImageTriggerRef}
                      type="button"
                      className="group relative flex size-full min-h-0 min-w-0 items-center justify-center rounded-xl outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#09bc8a] focus-visible:ring-offset-2"
                      onClick={() => openLightbox(galleryIndex)}
                      aria-label="Ampliar imagem do produto"
                    >
                      <img
                        src={heroSrc}
                        alt=""
                        className="max-h-56 w-full max-w-full object-contain transition duration-200 group-hover:scale-[1.02] sm:max-h-64 md:max-h-[380px] lg:max-h-[420px]"
                        decoding="async"
                      />
                      <span className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100">
                        Clique para ampliar
                      </span>
                    </button>
                  ) : (
                    <div className="flex size-full flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
                      <span className="text-sm font-medium">Sem imagens para exibir</span>
                      <span className="text-xs">Este anúncio pode incluir fotos em breve.</span>
                    </div>
                  )}
                </div>
                {produto.imagens.length > 1 && (
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                    {produto.imagens.map((src, idx) => (
                      <button
                        key={`${src}-${idx}`}
                        type="button"
                        onClick={() => setGalleryIndex(idx)}
                        className={`flex aspect-video items-center justify-center overflow-hidden rounded-lg border bg-white outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring ${
                          idx === galleryIndex
                            ? "border-[#09bc8a]"
                            : "border-transparent opacity-85"
                        }`}
                        aria-label={`Ver imagem ${idx + 1}`}
                      >
                        <img
                          src={src}
                          alt=""
                          className="h-full w-full object-contain"
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                )}
                {isSellerPreview ? (
                  <Card className="w-full min-w-0 overflow-hidden border-muted bg-muted/20 lg:hidden">
                    <CardHeader className="min-w-0 pb-4">
                      <CardTitle className="break-words text-lg whitespace-normal">Comprar</CardTitle>
                      <CardDescription className="break-words whitespace-normal">
                        Modo vendedor: use a página pública para testar carrinho e compra.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex min-w-0 flex-col gap-3 sm:flex-row">
                      <Button type="button" disabled variant="secondary" className="pointer-events-none w-full gap-2 opacity-80 sm:flex-1" aria-disabled>
                        <ShoppingCart className="size-4" aria-hidden />
                        Adicionar ao carrinho
                      </Button>
                      <Button type="button" disabled variant="secondary" className="pointer-events-none w-full gap-2 opacity-80 sm:flex-1" aria-disabled>
                        Comprar
                      </Button>
                    </CardContent>
                  </Card>
                ) : null}
              </div>

              <div className="flex min-w-0 flex-col gap-6 self-start lg:max-w-full">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {produto.condicao ? (
                        <span className="inline-flex rounded-full border bg-muted px-2.5 py-1 text-xs font-semibold text-foreground">
                          {formatProdutoCondicaoLabel(produto.condicao)}
                        </span>
                      ) : null}
                      {produto.status ? (
                        <span className="inline-flex rounded-full bg-gradient-to-r from-[#09bc8a]/20 to-[#0c1b33]/15 px-2.5 py-1 text-xs font-semibold text-[#0c1b33] dark:text-foreground">
                          {produto.status}
                        </span>
                      ) : null}
                      {isSellerPreview && sellerPreviewAtivo != null ? (
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                            sellerPreviewAtivo
                              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                              : "border-slate-200 bg-slate-100 text-slate-700",
                          )}
                        >
                          {sellerPreviewAtivo ? "Ativo" : "Inativo"}
                        </span>
                      ) : null}
                    </div>

                    <h1 className="mt-4 min-w-0 break-words text-3xl font-extrabold tracking-tight sm:text-4xl">
                      {produto.titulo}
                    </h1>

                    <p className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                      {produto.precoTexto ?? "Preço sob consulta"}
                    </p>

                    {isSellerPreview && sellerPromoTexto ? (
                      <p className="mt-2 break-words text-sm font-medium text-emerald-900">
                        Preço promocional: {sellerPromoTexto}
                      </p>
                    ) : null}

                    {isSellerPreview ? (
                      <div className="mt-3 flex min-w-0 flex-col gap-2 text-sm">
                        {sellerCatalogMeta.loading ? (
                          <p className="text-muted-foreground" role="status">
                            Carregando categoria e marca…
                          </p>
                        ) : sellerCatalogMeta.error ? (
                          <p className="text-amber-900" role="status">
                            {sellerCatalogMeta.error}
                          </p>
                        ) : sellerCatalogMeta.resolved ? (
                          <>
                            {sellerCatalogMeta.resolved.categoriaPaiNome ? (
                              <p className="break-words text-muted-foreground">
                                <span className="font-medium text-foreground">Categoria: </span>
                                {sellerCatalogMeta.resolved.categoriaPaiNome}
                              </p>
                            ) : sellerCatalogMeta.resolved.categoriaNaoEncontrada ? (
                              <p className="break-words text-muted-foreground">
                                <span className="font-medium text-foreground">Categoria: </span>
                                Categoria não encontrada
                              </p>
                            ) : null}
                            {sellerCatalogMeta.resolved.subcategoriaNome ? (
                              <p className="break-words text-muted-foreground">
                                <span className="font-medium text-foreground">Subcategoria: </span>
                                {sellerCatalogMeta.resolved.subcategoriaNome}
                              </p>
                            ) : null}
                            {sellerCatalogMeta.resolved.marcaNome ? (
                              <p className="break-words text-muted-foreground">
                                <span className="font-medium text-foreground">Marca: </span>
                                {sellerCatalogMeta.resolved.marcaNome}
                                {sellerCatalogMeta.resolved.marcaInativa ? " (inativa)" : ""}
                              </p>
                            ) : sellerCatalogMeta.resolved.marcaNaoEncontrada ? (
                              <p className="break-words text-muted-foreground">
                                <span className="font-medium text-foreground">Marca: </span>
                                Marca não encontrada
                              </p>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    ) : null}

                    {produto.estoqueTexto ? (
                      <p className="mt-3 text-sm text-muted-foreground">
                        Estoque:{" "}
                        <span className="font-medium text-foreground">{produto.estoqueTexto}</span>
                      </p>
                    ) : null}
                  </div>

                  {!isSellerPreview ? (
                    <div className="flex w-full shrink-0 justify-start sm:w-auto sm:justify-end sm:pt-0.5">
                      {!bootstrapped ? (
                        <button
                          type="button"
                          disabled
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-red-500 opacity-60"
                          aria-label="Favoritos indisponíveis no momento"
                        >
                          <Heart className="size-5" strokeWidth={2} aria-hidden />
                        </button>
                      ) : !isAuthenticated ? (
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 rounded-full border border-gray-200 bg-white p-0 text-red-500 shadow-sm transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-500"
                          asChild
                        >
                          <Link
                            to={loginNextHref}
                            aria-label="Fazer login para adicionar aos favoritos"
                          >
                            <Heart className="size-5" strokeWidth={2} aria-hidden />
                          </Link>
                        </Button>
                      ) : (
                        <button
                          type="button"
                          disabled={favActionPending || isFavorite === null || !produto}
                          onClick={handleToggleFavorite}
                          aria-label={
                            favActionPending
                              ? "Atualizando favoritos"
                              : isFavorite === null
                                ? "Carregando estado dos favoritos"
                                : isFavorite
                                  ? "Remover dos favoritos"
                                  : "Adicionar aos favoritos"
                          }
                          className={cn(
                            "inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-red-500 shadow-sm transition-all hover:border-red-300 hover:bg-red-50",
                            isFavorite &&
                              "border-red-200 bg-red-50 hover:border-red-400 hover:bg-red-100",
                          )}
                        >
                          {favActionPending || isFavorite === null ? (
                            <Loader2 className="size-5 shrink-0 animate-spin text-red-500" aria-hidden />
                          ) : (
                            <Heart
                              className={cn(
                                "size-5 transition-colors",
                                isFavorite ? "fill-red-500 text-red-500" : "text-red-500",
                              )}
                              strokeWidth={2}
                              aria-hidden
                            />
                          )}
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>

                {isSellerPreview ? (
                  <Card className="hidden min-w-0 overflow-hidden border-muted bg-muted/20 lg:block">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg">Comprar</CardTitle>
                      <CardDescription>
                        Você está no modo vendedor. Para testar carrinho e fluxo de compra, use a
                        página pública deste produto.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3 sm:flex-row">
                      <Button type="button" disabled variant="secondary" className="pointer-events-none w-full gap-2 opacity-80 sm:flex-1" aria-disabled>
                        <ShoppingCart className="size-4" aria-hidden />
                        Adicionar ao carrinho
                      </Button>
                      <Button type="button" disabled variant="secondary" className="pointer-events-none w-full gap-2 opacity-80 sm:flex-1" aria-disabled>
                        Comprar
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg">Comprar</CardTitle>
                      <CardDescription>
                        Adicione ao carrinho para comprar depois. Favoritos salvos aparecem em{" "}
                        <Link
                          to="/favorites"
                          className="font-medium text-[#09bc8a] underline-offset-4 hover:underline"
                        >
                          Meus favoritos
                        </Link>
                        .
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                      <div className="flex flex-col gap-3 sm:flex-row">
                        {!bootstrapped ? (
                          <Button type="button" disabled className="gap-2 bg-gradient-to-r from-[#09bc8a] to-[#0c1b33] text-white sm:flex-1">
                            <ShoppingCart className="size-4" aria-hidden />
                            Adicionar ao carrinho
                          </Button>
                        ) : !isAuthenticated ? (
                          <Button variant="outline" className="gap-2 border-[#09bc8a] text-[#09bc8a] hover:bg-[#09bc8a]/10 sm:flex-1" asChild>
                            <Link to={loginNextHref}>
                              <ShoppingCart className="size-4" aria-hidden />
                              Adicionar ao carrinho
                            </Link>
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            className="gap-2 bg-gradient-to-r from-[#09bc8a] to-[#0c1b33] text-white hover:opacity-90 sm:flex-1"
                            disabled={addPending}
                            onClick={handleAddToCart}
                          >
                            {addPending ? (
                              <Loader2 className="size-4 animate-spin" aria-hidden />
                            ) : (
                              <ShoppingCart className="size-4" aria-hidden />
                            )}
                            Adicionar ao carrinho
                          </Button>
                        )}
                        {!bootstrapped ? (
                          <Button type="button" className="gap-2 bg-[#0c1b33] font-semibold text-white opacity-60 sm:flex-1" disabled>
                            Comprar
                          </Button>
                        ) : !isAuthenticated ? (
                          <Button className="gap-2 bg-[#0c1b33] font-semibold text-white hover:bg-[#0c1b33]/90 sm:flex-1" asChild>
                            <Link to={loginNextHref}>Comprar</Link>
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            className="gap-2 bg-[#0c1b33] font-semibold text-white shadow-md hover:bg-[#0c1b33]/90 sm:flex-1"
                            onClick={handleBuyPlaceholder}
                          >
                            Comprar
                          </Button>
                        )}
                      </div>
                      {cartMessage ? (
                        <p className="text-sm text-destructive" role="alert">
                          {cartMessage}
                        </p>
                      ) : null}
                      {favMessage ? (
                        <p className="text-sm text-destructive" role="alert">
                          {favMessage}
                        </p>
                      ) : null}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            <section className="space-y-4" aria-labelledby="descricao-heading">
              <h2 id="descricao-heading" className="text-xl font-bold tracking-tight">
                Descrição
              </h2>
              <Card className="min-w-0 overflow-hidden">
                <CardContent className="text-sm leading-relaxed text-muted-foreground">
                  {produto.descricao ? (
                    <div className="min-w-0 max-w-none [&_a]:break-words">
                      <ReactMarkdown
                        remarkPlugins={[remarkBreaks]}
                        components={PRODUTO_DESCRICAO_MARKDOWN_COMPONENTS}
                        urlTransform={(url) => {
                          const t = url.trim();
                          if (/^javascript:/i.test(t)) return "";
                          return url;
                        }}
                      >
                        {produto.descricao}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p>Nenhuma descrição detalhada foi informada neste anúncio.</p>
                  )}
                </CardContent>
              </Card>
            </section>

            <section className="space-y-4" aria-labelledby="caracteristicas-heading">
              <h2 id="caracteristicas-heading" className="text-xl font-bold tracking-tight">
                Características do produto
              </h2>
              <Card className="min-w-0 overflow-hidden">
                <CardContent className="py-8 text-sm leading-relaxed text-muted-foreground sm:py-10">
                  {produto.indexadores.length > 0 ? (
                    <CaracteristicasProdutoTabela items={produto.indexadores} />
                  ) : (
                    <p>Nenhuma característica foi informada neste anúncio.</p>
                  )}
                </CardContent>
              </Card>
            </section>

            {showAvaliacoesBlock && (
              <section
                className="space-y-4"
                aria-labelledby="avaliacoes-heading"
              >
                <h2
                  id="avaliacoes-heading"
                  className="text-xl font-bold tracking-tight"
                >
                  Avaliações
                </h2>
                {avaliacoes.rows.length === 0 ? (
                  <Card>
                    <CardContent className="py-10 text-center text-sm text-muted-foreground">
                      Nenhuma avaliação disponível neste momento.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="flex flex-col gap-3">
                    {avaliacoes.rows.map((a, idx) => (
                      <Card
                        key={`${idx}-${String(a.notaTexto ?? "")}-${(a.comentario ?? "").slice(0, 16)}`}
                      >
                        <CardHeader className="pb-2">
                          {a.notaTexto && (
                            <p className="text-sm font-semibold text-foreground">
                              Nota: {a.notaTexto}
                            </p>
                          )}
                          {a.comentario && (
                            <CardDescription className="text-sm leading-relaxed text-muted-foreground">
                              {a.comentario}
                            </CardDescription>
                          )}
                          {a.meta && (
                            <p className="text-xs text-muted-foreground">
                              {a.meta}
                            </p>
                          )}
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                )}
              </section>
            )}

            {showPerguntasBlock && (
              <section
                className="space-y-4"
                aria-labelledby="perguntas-heading"
              >
                <h2
                  id="perguntas-heading"
                  className="text-xl font-bold tracking-tight text-foreground"
                >
                  Perguntas
                </h2>
                {perguntas.rows.length === 0 ? (
                  <Card>
                    <CardContent className="py-10 text-center text-sm text-muted-foreground">
                      Ainda não há perguntas públicas aqui.
                    </CardContent>
                  </Card>
                ) : (
                  <ul
                    className="m-0 flex list-none flex-col gap-3 p-0"
                    role="list"
                  >
                    {perguntas.rows.map((p, idx) => {
                      const isOpen = perguntaAbertaIdx === idx;
                      const triggerId = `pergunta-trigger-${idx}`;
                      const panelId = `pergunta-resposta-${idx}`;
                      return (
                        <li
                          key={`${idx}-${p.texto.slice(0, 24)}`}
                          className={cn(
                            "overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-300 ease-out motion-reduce:duration-150",
                            isOpen
                              ? "border-[#09bc8a] bg-emerald-50/40 shadow-[0_10px_28px_rgba(9,188,138,0.22)] dark:border-[#09bc8a] dark:bg-emerald-950/30"
                              : "border-border hover:border-[#09bc8a] hover:shadow-[0_8px_24px_rgba(9,188,138,0.18)] dark:hover:border-emerald-500/70",
                          )}
                        >
                          <button
                            type="button"
                            id={triggerId}
                            className="flex w-full cursor-pointer items-start justify-between gap-3 px-5 py-4 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#09bc8a] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                            aria-expanded={isOpen}
                            aria-controls={panelId}
                            onClick={() =>
                              setPerguntaAbertaIdx(isOpen ? null : idx)
                            }
                          >
                            <span className="min-w-0 flex-1 space-y-1">
                              <span className="block text-sm font-semibold leading-snug text-foreground">
                                {p.texto}
                              </span>
                              {p.meta ? (
                                <span className="block text-xs font-normal text-muted-foreground">
                                  {p.meta}
                                </span>
                              ) : null}
                            </span>
                            <ChevronDown
                              className={cn(
                                "mt-0.5 size-5 shrink-0 text-muted-foreground transition-transform duration-300 ease-out motion-reduce:duration-150",
                                isOpen && "rotate-180 text-[#09bc8a]",
                              )}
                              aria-hidden
                            />
                          </button>
                          <div
                            className={cn(
                              "grid min-h-0 overflow-hidden transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
                              isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                            )}
                          >
                            <div className="min-h-0 overflow-hidden">
                              <div
                                id={panelId}
                                role="region"
                                aria-labelledby={triggerId}
                                aria-hidden={!isOpen}
                                className={cn(
                                  "px-5 py-4 text-sm leading-relaxed text-muted-foreground transition-opacity duration-200 ease-out",
                                  isOpen
                                    ? "border-t border-emerald-200 bg-transparent opacity-100 dark:border-emerald-600/55"
                                    : "border-t border-transparent opacity-0",
                                )}
                              >
                                {p.resposta ? (
                                  <p className="text-pretty">{p.resposta}</p>
                                ) : (
                                  <p className="italic text-muted-foreground">
                                    Nenhuma resposta pública foi publicada ainda.
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            )}
          </>
        ) : null}
      </main>

      <Footer />

      {lightboxOpen && lightboxSrc && (
        <div
          ref={lightboxRootRef}
          className="fixed inset-0 z-[9999] flex flex-col bg-black/90 p-4 text-white"
          role="dialog"
          aria-modal="true"
          aria-label="Visualizador de imagens do produto"
          onClick={closeLightbox}
        >
          <p
            className="absolute left-4 top-4 z-20 text-sm font-semibold"
            onClick={(event) => event.stopPropagation()}
          >
            {lightboxIndex + 1}/{lightboxImageCount}
          </p>

          <button
            type="button"
            className="absolute right-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow transition hover:bg-white"
            onClick={(event) => {
              event.stopPropagation();
              closeLightbox();
            }}
            aria-label="Fechar visualizador"
          >
            <X className="size-5" aria-hidden />
          </button>

          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            <div
              className={cn(
                "absolute left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/90 p-2 shadow-lg backdrop-blur",
                lightboxImageCount > 1 ? "bottom-24" : "bottom-5",
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-900 shadow transition hover:bg-slate-100 disabled:opacity-40"
                disabled={lbScale <= LB_ZOOM_MIN}
                onClick={(e) => {
                  e.stopPropagation();
                  setLbScale((s) =>
                    Math.max(
                      LB_ZOOM_MIN,
                      Number((s - LB_ZOOM_STEP).toFixed(2)),
                    ),
                  );
                }}
                aria-label="Diminuir zoom"
              >
                <ZoomOut className="size-5" aria-hidden />
              </button>
              <span className="min-w-12 text-center text-xs font-semibold text-slate-900">
                {Math.round(lbScale * 100)}%
              </span>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-900 shadow transition hover:bg-slate-100 disabled:opacity-40"
                disabled={lbScale >= LB_ZOOM_MAX}
                onClick={(e) => {
                  e.stopPropagation();
                  setLbScale((s) =>
                    Math.min(
                      LB_ZOOM_MAX,
                      Number((s + LB_ZOOM_STEP).toFixed(2)),
                    ),
                  );
                }}
                aria-label="Aumentar zoom"
              >
                <ZoomIn className="size-5" aria-hidden />
              </button>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-900 shadow transition hover:bg-slate-100 disabled:opacity-40"
                disabled={lbScale === LB_ZOOM_MIN}
                onClick={(e) => {
                  e.stopPropagation();
                  resetLightboxTransform();
                }}
                aria-label="Redefinir zoom"
              >
                <RotateCcw className="size-5" aria-hidden />
              </button>
            </div>

            <div
              className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden"
              onTouchStart={(event) => {
                if (lbScale > 1) return;
                if (lightboxImageCount <= 1) return;
                const t = event.touches[0];
                if (!t) return;
                touchLockedRef.current = false;
                touchStartRef.current = { x: t.clientX, y: t.clientY };
                touchLastRef.current = { x: t.clientX, y: t.clientY };
                setSwipeTransition(false);
                setSwipeOffsetX(0);
              }}
              onTouchMove={(event) => {
                if (lbScale > 1) return;
                if (!touchStartRef.current) return;
                const t = event.touches[0];
                if (!t) return;
                touchLastRef.current = { x: t.clientX, y: t.clientY };
                const dx = t.clientX - touchStartRef.current.x;
                const dy = t.clientY - touchStartRef.current.y;
                if (touchLockedRef.current) {
                  setSwipeOffsetX(dx);
                  return;
                }
                if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.2) {
                  touchLockedRef.current = true;
                  setSwipeOffsetX(dx);
                }
              }}
              onTouchEnd={() => {
                if (lbScale > 1) return;
                if (!touchStartRef.current) return;
                const start = touchStartRef.current;
                const last = touchLastRef.current ?? start;
                touchStartRef.current = null;
                touchLastRef.current = null;

                // Se não "travou" como swipe horizontal, ignora.
                if (!touchLockedRef.current) return;
                touchLockedRef.current = false;

                const dx = last.x - start.x;
                const dy = last.y - start.y;
                const SWIPE_MIN_PX = 48;

                // Só troca se for um swipe bem horizontal.
                if (
                  Math.abs(dx) < SWIPE_MIN_PX ||
                  Math.abs(dx) < Math.abs(dy) * 1.2
                ) {
                  setSwipeTransition(true);
                  setSwipeOffsetX(0);
                  window.setTimeout(() => setSwipeTransition(false), 160);
                  return;
                }

                const width = Math.max(320, window.innerWidth || 0);
                const toNext = dx < 0;
                const exitX = toNext ? -width : width;
                const enterX = toNext ? width : -width;

                setSwipeTransition(true);
                setSwipeOffsetX(exitX);

                window.setTimeout(() => {
                  if (toNext) goToNextLightboxImage();
                  else goToPreviousLightboxImage();

                  setSwipeTransition(false);
                  setSwipeOffsetX(enterX);

                  requestAnimationFrame(() => {
                    setSwipeTransition(true);
                    setSwipeOffsetX(0);
                    window.setTimeout(() => setSwipeTransition(false), 160);
                  });
                }, 160);
              }}
            >
              {lightboxImageCount > 1 && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="absolute left-4 top-1/2 z-10 hidden size-12 -translate-y-1/2 rounded-full border-0 bg-white/90 text-slate-900 shadow-lg ring-1 ring-black/10 transition hover:bg-white hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-emerald-500 sm:inline-flex"
                    onClick={(e) => {
                      e.stopPropagation();
                      goToPreviousLightboxImage();
                    }}
                    aria-label="Imagem anterior"
                  >
                    <ChevronLeft className="size-6 text-slate-900" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="absolute right-4 top-1/2 z-10 hidden size-12 -translate-y-1/2 rounded-full border-0 bg-white/90 text-slate-900 shadow-lg ring-1 ring-black/10 transition hover:bg-white hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-emerald-500 sm:inline-flex"
                    onClick={(e) => {
                      e.stopPropagation();
                      goToNextLightboxImage();
                    }}
                    aria-label="Próxima imagem"
                  >
                    <ChevronRight className="size-6 text-slate-900" aria-hidden />
                  </Button>
                </>
              )}

              <div
                className={
                  swipeTransition
                    ? "transition-transform duration-150 ease-out"
                    : "transition-none"
                }
                style={{
                  transform: `translateX(${swipeOffsetX}px)`,
                  touchAction: lbScale > 1 ? "none" : "pan-y",
                }}
              >
                <div
                  className={cn(
                    !lbDragging &&
                      !swipeTransition &&
                      "duration-200 ease-out transition-transform",
                  )}
                  style={{
                    transform: `translate(${lbPan.x}px, ${lbPan.y}px) scale(${lbScale})`,
                    transformOrigin: "center center",
                    touchAction: lbScale > 1 ? "none" : "manipulation",
                    cursor:
                      lbScale > 1
                        ? lbDragging
                          ? "grabbing"
                          : "grab"
                        : "default",
                  }}
                  onPointerDown={handleLbPanPointerDown}
                  onPointerMove={handleLbPanPointerMove}
                  onPointerUp={handleLbPanPointerUp}
                  onPointerCancel={handleLbPanPointerUp}
                  onClick={(e) => e.stopPropagation()}
                >
                  <img
                    src={lightboxSrc}
                    alt=""
                    className={`max-w-[calc(100vw-2rem)] select-none object-contain ${
                      lightboxImageCount > 1
                        ? "max-h-[calc(100vh-11rem)]"
                        : "max-h-[calc(100vh-5rem)]"
                    }`}
                    draggable={false}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      toggleLbDoubleZoom();
                    }}
                    onTouchEnd={() => {
                      handleLbImageTouchEnd();
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {lightboxImageCount > 1 && (
            <div
              className="border-t border-white/10 px-4 py-3"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mx-auto flex max-w-5xl gap-2 overflow-x-auto">
                {productImages.map((src, idx) => (
                  <button
                    key={`${src}-${idx}-lightbox`}
                    type="button"
                    onClick={() => goToLightboxImage(idx)}
                    className={`flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-white/10 ${
                      idx === lightboxIndex
                        ? "border-[#09bc8a] ring-2 ring-[#09bc8a]/20"
                        : "border-white/20 opacity-80 hover:opacity-100"
                    }`}
                    aria-label={`Ver imagem ${idx + 1}`}
                  >
                    <img
                      src={src}
                      alt=""
                      className="h-full w-full object-contain"
                      loading="lazy"
                      decoding="async"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

