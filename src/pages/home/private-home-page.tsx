import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  FaMagnifyingGlass,
  FaArrowRightToBracket,
  FaFilter,
  FaChevronDown,
  FaBicycle,
  FaArrowRight,
} from "react-icons/fa6";
import { ChevronLeft, ChevronRight, ChevronDown, Check, Heart, Loader2 } from "lucide-react";
import { Header } from "../../components/header";
import { Footer } from "../../components/footer";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { paths } from "@/api/endpoints/paths";
import {
  listCategorias,
  listMarcas,
  type CatalogoOption,
} from "@/api/endpoints/catalogo.routes";
import { listLancamentos, listProdutos } from "@/api/endpoints/produtos.routes";
import {
  addFavorito,
  listFavoritos,
  removeFavorito,
} from "@/api/endpoints/favoritos.routes";
import type { Marca } from "@/types/marca";
import type { ProdutoId, ProdutoListaView, ProdutoListagemItem } from "@/types/produto";
import {
  itemUnknownToListaView,
  normalizeProdutosListResponseWithMeta,
} from "@/types/produto";
import { favoriteIdsFromListPayload } from "@/types/favorito";
import { produtosSearchFromUserPhrase } from "@/lib/produtos-search";
import { readSearchQueryParam } from "@/lib/search-query-params";
import { writeProductsListFilters } from "@/lib/products-list-params";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/auth-context";
import { useFavoritesCount } from "@/contexts/favorites-count-context";

function friendlyProdutosError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    if (status === 404) return "Nenhum resultado encontrado no servidor.";
    if (status && status >= 500)
      return "Servidor temporariamente indisponível. Tente de novo mais tarde.";
    if (!err.response && err.code === "ERR_NETWORK")
      return "Não foi possível conectar. Verifique sua rede.";
  }
  return "Não foi possível carregar os produtos.";
}

const LANCAMENTOS_VITRINE_MAX = 4;
const ESTILO_BIKES_VITRINE_MAX = 6;

function normalizeCategoriaNomeCatalogo(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Escolhe `categoria_id` para `listProdutos` com base nos nomes de `listCategorias()`
 * (GET /categorias). Sem id fixo de produto.
 */
function resolveCategoriaBicicletasId(categorias: CatalogoOption[]): number | null {
  for (const c of categorias) {
    const n = normalizeCategoriaNomeCatalogo(c.nome);
    if (n.includes("bicicleta")) return c.id;
  }
  for (const c of categorias) {
    const n = normalizeCategoriaNomeCatalogo(c.nome);
    if (n === "bike" || n === "bikes") return c.id;
  }
  return null;
}

function friendlyLancamentosError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    if (status && status >= 500)
      return "Não foi possível carregar os lançamentos. Tente de novo mais tarde.";
    if (!err.response && err.code === "ERR_NETWORK")
      return "Sem conexão. Verifique sua rede.";
  }
  return "Não foi possível carregar os lançamentos.";
}

/** Header fixo + bloco da busca acima da seção; valor maior “sobe” mais a página (hero + folga visíveis). */
const HOME_PRODUTOS_SCROLL_TOP_OFFSET_PX = 298;

function scrollHomeProdutosSectionToTop(el: HTMLElement | null) {
  if (!el) return;
  const y =
    el.getBoundingClientRect().top +
    window.scrollY -
    HOME_PRODUTOS_SCROLL_TOP_OFFSET_PX;
  window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
}

function parsePrecoBRL(text: string | null): number | null {
  if (!text || !text.trim()) return null;
  const n = text
    .replace(/\s/g, "")
    .replace(/R\$\s*/i, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const v = Number.parseFloat(n);
  return Number.isFinite(v) ? v : null;
}

type FiltroSelectOption = { id: string; name: string };

function applyHomeFilters(
  items: ProdutoListaView[],
  filters: {
    categoria: string;
    marca: string;
    condicao: string;
    precoMin: string;
    precoMax: string;
    localizacao: string;
  },
  categorias: FiltroSelectOption[],
  marcas: FiltroSelectOption[],
): ProdutoListaView[] {
  let out = items;

  if (filters.categoria) {
    const name = categorias.find((c) => c.id === filters.categoria)?.name ?? "";
    if (name.trim()) {
      const n = name.toLowerCase();
      out = out.filter((p) => p.titulo.toLowerCase().includes(n));
    }
  }

  if (filters.marca) {
    const name = marcas.find((m) => m.id === filters.marca)?.name ?? "";
    if (name.trim()) {
      const n = name.toLowerCase();
      out = out.filter((p) => p.titulo.toLowerCase().includes(n));
    }
  }

  if (filters.condicao) {
    const c = filters.condicao.toLowerCase();
    out = out.filter((p) => {
      const s = (p.statusOuCondicao ?? "").toLowerCase();
      return s.includes(c);
    });
  }

  if (filters.localizacao.trim()) {
    const loc = filters.localizacao.trim().toLowerCase();
    out = out.filter((p) => p.titulo.toLowerCase().includes(loc));
  }

  const minV = filters.precoMin.trim()
    ? Number.parseFloat(filters.precoMin)
    : null;
  const maxV = filters.precoMax.trim()
    ? Number.parseFloat(filters.precoMax)
    : null;

  if (minV != null && Number.isFinite(minV)) {
    out = out.filter((p) => {
      const val = parsePrecoBRL(p.precoTexto);
      return val == null || val >= minV;
    });
  }
  if (maxV != null && Number.isFinite(maxV)) {
    out = out.filter((p) => {
      const val = parsePrecoBRL(p.precoTexto);
      return val == null || val <= maxV;
    });
  }

  return out;
}

function parsePositiveInt(value: string): number | undefined {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parsePositiveFloat(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

const CONDICAO_FILTER_OPTIONS = [
  { value: "novo", label: "Novo" },
  { value: "semi-novo", label: "Semi-novo" },
  { value: "usado", label: "Usado" },
] as const;

/** Marcas exibidas de primeira na vitrine da home (o restante abre em “Ver mais”). */
const MARCAS_VITRINE_INICIAL = 6;

/** Estilo “select” shadcn sem `Select` do Radix (evita trava de scroll / sumir barra). */
function FilterDropdownField({
  id,
  label,
  value,
  onChange,
  options,
  disabled,
  emptyLabel = "Todas",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  options: readonly { value: string; label: string }[];
  disabled?: boolean;
  emptyLabel?: string;
}) {
  const selectedLabel = useMemo(() => {
    if (!value.trim()) return emptyLabel;
    return options.find((o) => o.value === value)?.label ?? emptyLabel;
  }, [value, options, emptyLabel]);

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-xs font-bold text-gray-700"
      >
        {label}
      </label>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          id={id}
          type="button"
          disabled={disabled}
          className={cn(
            "group flex h-[42px] w-full items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 text-left text-sm text-gray-900 outline-none",
            "focus:ring-0 focus-visible:border-gray-200 focus-visible:ring-0",
            "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500",
            "data-[state=open]:border-gray-300",
          )}
        >
          <span className="min-w-0 flex-1 truncate">{selectedLabel}</span>
          <ChevronDown
            className="size-4 shrink-0 text-gray-500 transition-transform duration-200 group-data-[state=open]:rotate-180"
            aria-hidden
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          side="bottom"
          sideOffset={6}
          avoidCollisions={false}
          data-home-filter-select=""
          className={cn(
            "z-[100] flex min-h-0 w-[var(--radix-dropdown-menu-trigger-width)] max-h-[min(18rem,var(--radix-dropdown-menu-content-available-height))] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white p-0 shadow-xl",
          )}
        >
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-clip p-1">
            <DropdownMenuItem
              onSelect={() => onChange("")}
              className={cn(
                "cursor-pointer rounded-lg",
                !value.trim() && "bg-[#09bc8a]/10 font-medium text-[#09bc8a]",
              )}
            >
              <span className="min-w-0 flex-1">{emptyLabel}</span>
              {!value.trim() ? (
                <Check className="size-4 shrink-0 text-[#09bc8a]" aria-hidden />
              ) : null}
            </DropdownMenuItem>
            {options.map((opt) => (
              <DropdownMenuItem
                key={opt.value}
                onSelect={() => onChange(opt.value)}
                className={cn(
                  "cursor-pointer rounded-lg",
                  value === opt.value &&
                    "bg-[#09bc8a]/10 font-medium text-[#09bc8a]",
                )}
              >
                <span className="min-w-0 flex-1">{opt.label}</span>
                {value === opt.value ? (
                  <Check className="size-4 shrink-0 text-[#09bc8a]" aria-hidden />
                ) : null}
              </DropdownMenuItem>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function PrecoBuscaValor({
  raw,
  variant,
}: {
  raw: string;
  variant: "atual" | "original";
}) {
  if (variant === "original") {
    return (
      <p className="text-sm font-medium leading-tight text-gray-400 line-through">
        {raw}
      </p>
    );
  }

  const m = raw.match(/^R\$\s*([\d.]+)(,\d{2})?$/i);
  if (m) {
    const [, intPart, decPart] = m;
    return (
      <div className="flex items-start justify-center gap-0.5 text-[#09bc8a]">
        <span className="translate-y-0.5 text-[0.65rem] font-bold leading-none sm:text-xs">
          R$
        </span>
        <span className="text-2xl font-bold leading-none tracking-tight sm:text-3xl">
          {intPart}
        </span>
        {decPart ? (
          <span className="translate-y-0.5 text-[0.65rem] font-bold leading-none sm:text-xs">
            {decPart}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <p className="text-xl font-bold leading-tight text-[#09bc8a] sm:text-2xl">{raw}</p>
  );
}

/** Exibe preço no estilo da busca: R$ e centavos menores, inteiro em destaque. */
function PrecoBusca({
  precoTexto,
  precoOriginalTexto,
  className,
}: {
  precoTexto: string | null;
  precoOriginalTexto?: string | null;
  className?: string;
}) {
  const raw = precoTexto?.trim();
  const originalRaw = precoOriginalTexto?.trim();

  if (!raw) {
    return (
      <p className={cn("mt-3 text-sm font-medium text-gray-500", className)}>
        Preço sob consulta
      </p>
    );
  }

  return (
    <div className={cn("mt-3 flex flex-col items-center gap-1", className)}>
      {originalRaw ? <PrecoBuscaValor raw={originalRaw} variant="original" /> : null}
      <PrecoBuscaValor raw={raw} variant="atual" />
    </div>
  );
}

/** Card de produto da busca na home — reutilizado em “Destaque da semana”. */
function HomeBuscaProdutoCard({
  p,
  href,
  favoriteIds,
  pendingFavoriteIds,
  onToggleFavorite,
}: {
  p: ProdutoListaView;
  href: string;
  favoriteIds: Set<string>;
  pendingFavoriteIds: Set<string>;
  onToggleFavorite: (id: ProdutoId) => void;
}) {
  const key = String(p.id);
  const isFav = favoriteIds.has(key);
  const isFavPending = pendingFavoriteIds.has(key);
  return (
    <article className="flex h-full min-h-[360px] flex-col items-center rounded-xl border border-gray-100 bg-white px-4 pb-5 pt-4 text-center shadow-sm">
      <div className="relative mb-4 w-full">
        <Link
          to={href}
          className="relative flex h-48 w-full items-center justify-center overflow-hidden rounded-lg bg-gray-50 p-4 md:h-52"
        >
          {p.imagemUrl ? (
            <img
              src={p.imagemUrl}
              alt=""
              className="max-h-40 max-w-full object-contain md:max-h-44"
            />
          ) : (
            <FaBicycle className="text-gray-200" aria-hidden size={72} />
          )}
        </Link>

        <button
          type="button"
          onClick={() => void onToggleFavorite(p.id)}
          disabled={isFavPending}
          aria-pressed={isFav}
          aria-label={
            isFav ? "Remover dos favoritos" : "Adicionar aos favoritos"
          }
          title={
            isFav ? "Remover dos favoritos" : "Adicionar aos favoritos"
          }
          className={cn(
            "absolute right-2 top-2 inline-flex size-9 items-center justify-center rounded-full border bg-white/95 shadow-sm transition-colors disabled:opacity-60",
            isFav
              ? "border-red-200 text-red-500 hover:bg-red-50"
              : "border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-red-500",
          )}
        >
          {isFavPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Heart
              className={cn("size-4", isFav && "fill-red-500")}
              aria-hidden
            />
          )}
        </button>
      </div>

      <div className="flex w-full flex-col items-center gap-2">
        <Link
          to={href}
          className="line-clamp-2 flex min-h-[2.75rem] w-full items-center justify-center font-bold leading-snug text-gray-900 hover:text-[#09bc8a]"
        >
          {p.titulo}
        </Link>

        <PrecoBusca
          precoTexto={p.precoTexto}
          precoOriginalTexto={p.precoOriginalTexto}
          className="mt-0"
        />
      </div>

      <button
        type="button"
        onClick={() => void onToggleFavorite(p.id)}
        disabled={isFavPending}
        className={cn(
          "my-3 min-h-[1rem] text-xs underline underline-offset-2 disabled:opacity-60",
          isFav
            ? "text-red-500 hover:text-red-600"
            : "text-gray-500 hover:text-red-500",
        )}
      >
        {isFavPending
          ? "Salvando…"
          : isFav
            ? "Salvo na lista de desejos"
            : "Adicione na lista de desejos"}
      </button>

      <Link
        to={href}
        className="mt-auto flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#09bc8a] to-[#1e272e] py-2.5 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-95"
      >
        Compre agora
        <span className="inline-flex size-6 items-center justify-center rounded-full bg-white/15">
          <FaArrowRight className="size-3" aria-hidden />
        </span>
      </Link>
    </article>
  );
}

const PAGE_SIZE_OPTIONS = [5, 10, 20] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];
const DEFAULT_PAGE_SIZE: PageSize = 20;

export function PrivateHomePage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { refreshFavoriteCount } = useFavoritesCount();

  const [lancamentos, setLancamentos] = useState<ProdutoListagemItem[]>([]);
  const [lancamentosStatus, setLancamentosStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [lancamentosError, setLancamentosError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState("tab1");
  const [searchValue, setSearchValue] = useState("");

  // Dropdown filtros
  const [showFilters, setShowFilters] = useState(false);
  const filterWrapRef = useRef<HTMLDivElement | null>(null);

  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set());
  const [pendingFavoriteIds, setPendingFavoriteIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [favoriteError, setFavoriteError] = useState<string | null>(null);

  // Carrega ids favoritados do usuário logado (uma vez por sessão).
  useEffect(() => {
    if (!isAuthenticated) {
      setFavoriteIds(new Set());
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await listFavoritos();
        if (cancelled) return;
        if (!res.ok) {
          setFavoriteIds(new Set());
          return;
        }
        setFavoriteIds(favoriteIdsFromListPayload(res.data));
      } catch {
        if (!cancelled) setFavoriteIds(new Set());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const handleToggleFavorite = useCallback(
    async (produtoId: ProdutoId) => {
      const key = String(produtoId);
      if (pendingFavoriteIds.has(key)) return;

      const wasFavorite = favoriteIds.has(key);
      setFavoriteError(null);
      setPendingFavoriteIds((prev) => {
        const next = new Set(prev);
        next.add(key);
        return next;
      });
      // Update otimista.
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (wasFavorite) next.delete(key);
        else next.add(key);
        return next;
      });

      try {
        if (wasFavorite) {
          await removeFavorito(produtoId);
        } else {
          await addFavorito(produtoId);
        }
        // Atualiza badge no header.
        void refreshFavoriteCount();
      } catch {
        // Rollback em erro.
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (wasFavorite) next.add(key);
          else next.delete(key);
          return next;
        });
        setFavoriteError(
          "Não foi possível atualizar seus favoritos. Tente de novo.",
        );
      } finally {
        setPendingFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [favoriteIds, pendingFavoriteIds, refreshFavoriteCount],
  );

  const [filters, setFilters] = useState({
    categoria: "",
    marca: "",
    condicao: "",
    precoMin: "",
    precoMax: "",
    localizacao: "",
  });

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const [filtroCategorias, setFiltroCategorias] = useState<FiltroSelectOption[]>(
    [],
  );
  const [filtroMarcas, setFiltroMarcas] = useState<FiltroSelectOption[]>([]);
  const [marcasHome, setMarcasHome] = useState<Marca[]>([]);
  const [failedMarcaLogoIds, setFailedMarcaLogoIds] = useState(
    () => new Set<number>(),
  );
  const [marcasVitrineExpanded, setMarcasVitrineExpanded] = useState(false);
  const [filtroCatalogoStatus, setFiltroCatalogoStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");

  const marcasHomeOrdenadas = useMemo(() => {
    const byId = new Map<number, Marca>();
    for (const m of marcasHome) {
      if (m.ativo === false) continue;
      if (!byId.has(m.id)) byId.set(m.id, m);
    }
    const list = [...byId.values()];
    list.sort((a, b) => {
      const la = Boolean(a.logo_url?.trim());
      const lb = Boolean(b.logo_url?.trim());
      if (la !== lb) return la ? -1 : 1;
      return a.nome.localeCompare(b.nome, "pt-BR");
    });
    return list;
  }, [marcasHome]);

  const marcasVitrineVisiveis = useMemo(
    () =>
      marcasVitrineExpanded
        ? marcasHomeOrdenadas
        : marcasHomeOrdenadas.slice(0, MARCAS_VITRINE_INICIAL),
    [marcasHomeOrdenadas, marcasVitrineExpanded],
  );

  useEffect(() => {
    let cancelled = false;
    setFiltroCatalogoStatus("loading");
    void (async () => {
      try {
        const [cats, marcas] = await Promise.all([
          listCategorias(),
          listMarcas(),
        ]);
        if (cancelled) return;
        setFiltroCategorias(
          cats.map((c) => ({ id: String(c.id), name: c.nome })),
        );
        setFiltroMarcas(marcas.map((m) => ({ id: String(m.id), name: m.nome })));
        setMarcasHome(marcas);
        setFiltroCatalogoStatus("ready");
      } catch {
        if (!cancelled) {
          setFiltroCategorias([]);
          setFiltroMarcas([]);
          setMarcasHome([]);
          setFiltroCatalogoStatus("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLancamentosStatus("loading");
    setLancamentosError(null);
    void (async () => {
      try {
        const res = await listLancamentos();
        if (cancelled) return;
        const raw = Array.isArray(res.data) ? res.data : [];
        setLancamentos(raw.slice(0, LANCAMENTOS_VITRINE_MAX));
        setLancamentosStatus("ready");
      } catch (e) {
        if (!cancelled) {
          setLancamentos([]);
          setLancamentosError(friendlyLancamentosError(e));
          setLancamentosStatus("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const [searchParams] = useSearchParams();

  const activeFiltersCount = useMemo(() => {
    return Object.values(filters).filter((v) => String(v ?? "").trim() !== "")
      .length;
  }, [filters]);

  const [loadingProdutos, setLoadingProdutos] = useState(false);
  const [produtosErro, setProdutosErro] = useState<string | null>(null);
  const [produtosFiltrados, setProdutosFiltrados] = useState<
    ProdutoListaView[]
  >([]);
  const [produtosTotal, setProdutosTotal] = useState(0);
  const [totalResultsPages, setTotalResultsPages] = useState(1);
  const [resultsPage, setResultsPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(DEFAULT_PAGE_SIZE);

  const [estiloVitrineProdutos, setEstiloVitrineProdutos] = useState<
    ProdutoListaView[]
  >([]);
  const [estiloVitrineStatus, setEstiloVitrineStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [estiloVitrineSemCategoria, setEstiloVitrineSemCategoria] =
    useState(false);
  const [estiloVitrineErro, setEstiloVitrineErro] = useState<string | null>(
    null,
  );

  const runProductQuery = useCallback(async (
    page: number,
    currentPageSize: PageSize,
  ) => {
    setLoadingProdutos(true);
    setProdutosErro(null);
    try {
      const res = await listProdutos({
        ordenacao: "recentes",
        page,
        page_size: currentPageSize,
      });
      const { items, meta } = normalizeProdutosListResponseWithMeta(res.data);
      const base = items;

      setProdutosFiltrados(base);
      setProdutosTotal(meta?.total ?? base.length);
      setTotalResultsPages(
        meta?.total_pages ?? Math.max(1, Math.ceil(base.length / currentPageSize)),
      );
    } catch (e) {
      setProdutosFiltrados([]);
      setProdutosTotal(0);
      setTotalResultsPages(1);
      setProdutosErro(friendlyProdutosError(e));
    } finally {
      setLoadingProdutos(false);
    }
  }, []);

  // Links antigos `/home?q=` → listagem dedicada em `/produtos`.
  useEffect(() => {
    const q = readSearchQueryParam(searchParams);
    if (!q) return;
    const params = writeProductsListFilters({ q });
    const qs = new URLSearchParams(params).toString();
    navigate(`${paths.produtos()}?${qs}`, { replace: true });
  }, [searchParams, navigate]);

  useEffect(() => {
    void runProductQuery(resultsPage, pageSize);
  }, [resultsPage, pageSize, runProductQuery]);

  const navigateToProdutosList = useCallback(
    (term: string) => {
      setShowFilters(false);
      const currentFilters = filtersRef.current;
      const fromPhrase = produtosSearchFromUserPhrase(term);
      const params = writeProductsListFilters({
        q: fromPhrase?.q ?? (term.trim() || undefined),
        categoria_id: parsePositiveInt(currentFilters.categoria),
        marca_id: parsePositiveInt(currentFilters.marca),
        condicao: currentFilters.condicao || undefined,
        preco_min: parsePositiveFloat(currentFilters.precoMin),
        preco_max: parsePositiveFloat(currentFilters.precoMax),
      });
      const qs = new URLSearchParams(params).toString();
      navigate(qs ? `${paths.produtos()}?${qs}` : paths.produtos());
    },
    [navigate],
  );

  useEffect(() => {
    if (filtroCatalogoStatus === "loading") return;
    if (filtroCatalogoStatus === "error") {
      setEstiloVitrineProdutos([]);
      setEstiloVitrineSemCategoria(false);
      setEstiloVitrineErro(null);
      setEstiloVitrineStatus("ready");
      return;
    }

    let cancelled = false;
    setEstiloVitrineStatus("loading");
    setEstiloVitrineErro(null);

    const cats: CatalogoOption[] = filtroCategorias
      .map((c) => ({
        id: Number.parseInt(c.id, 10),
        nome: c.name,
      }))
      .filter((c) => Number.isFinite(c.id));
    const catId = resolveCategoriaBicicletasId(cats);

    if (catId == null) {
      setEstiloVitrineProdutos([]);
      setEstiloVitrineSemCategoria(true);
      setEstiloVitrineStatus("ready");
      return;
    }
    setEstiloVitrineSemCategoria(false);

    void (async () => {
      try {
        const res = await listProdutos({
          categoria_id: catId,
          ordenacao: "recentes",
          page: 1,
          page_size: ESTILO_BIKES_VITRINE_MAX,
        });
        if (cancelled) return;
        const { items } = normalizeProdutosListResponseWithMeta(res.data);
        setEstiloVitrineProdutos(items.slice(0, ESTILO_BIKES_VITRINE_MAX));
        setEstiloVitrineStatus("ready");
      } catch (e) {
        if (cancelled) return;
        setEstiloVitrineProdutos([]);
        setEstiloVitrineErro(friendlyProdutosError(e));
        setEstiloVitrineStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filtroCatalogoStatus, filtroCategorias]);

  const safeResultsPage = Math.min(resultsPage, totalResultsPages);

  const produtosPagina = useMemo(() => {
    return produtosFiltrados;
  }, [produtosFiltrados]);

  const submitSearch = useCallback(() => {
    navigateToProdutosList(searchValue);
  }, [searchValue, navigateToProdutosList]);

  const clearFilters = useCallback(() => {
    const cleared = {
      categoria: "",
      marca: "",
      condicao: "",
      precoMin: "",
      precoMax: "",
      localizacao: "",
    };
    filtersRef.current = cleared;
    setFilters(cleared);
  }, []);

  // Fecha dropdown ao clicar fora + ESC
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (!showFilters) return;
      const target = e.target as Node | null;
      if (
        target instanceof Element &&
        target.closest("[data-home-filter-select]")
      ) {
        return;
      }
      const el = filterWrapRef.current;
      if (!el) return;
      if (!el.contains(target as Node)) setShowFilters(false);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (!showFilters) return;
      if (e.key === "Escape") setShowFilters(false);
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [showFilters]);

  const produtosBuscaInicioRef = useRef<HTMLElement | null>(null);
  const brandsSectionRef = useRef<HTMLElement | null>(null);
  const skipPaginationScrollRef = useRef(true);

  const handleMarcaVitrineClick = useCallback(
    (marca: Marca) => {
      const params = writeProductsListFilters({ marca_id: marca.id });
      const qs = new URLSearchParams(params).toString();
      navigate(`${paths.produtos()}?${qs}`);
    },
    [navigate],
  );

  useEffect(() => {
    if (skipPaginationScrollRef.current) {
      skipPaginationScrollRef.current = false;
      return;
    }
    scrollHomeProdutosSectionToTop(produtosBuscaInicioRef.current);
  }, [resultsPage, pageSize]);

  return (
    <div className="font-sans m-0 p-0">
      <div className="relative z-[2000]">
        <Header />
      </div>

      <main className="mt-[60px]">
        <section id="home" className="relative max-md:mb-28 md:mb-32">
          <div className="relative h-[300px] w-full overflow-visible sm:h-[400px] md:h-[500px]">
            <img
              src="/img/fundo-home.png"
              alt="Fundo"
              className="absolute inset-0 h-full w-full object-cover"
              fetchPriority="high"
            />

            <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center text-white">
              <h1 className="home-hero-ranade-title mb-4 text-2xl font-bold sm:mb-6 sm:text-3xl md:mb-8 md:text-4xl lg:text-[40px]">
                SEU PRINCIPAL MARKETPLACE DE BIKES
              </h1>
            </div>

            <div className="absolute -bottom-12 left-0 right-0 z-[60] px-4 sm:-bottom-16 sm:px-6">
              <div className="mx-auto w-full max-w-[850px] overflow-visible rounded-xl bg-white shadow-lg">
                <div className="flex h-[38px] w-full overflow-hidden rounded-t-xl sm:h-[42px]">
                  <button
                    className={`flex-1 font-bold text-sm sm:text-base transition-colors ${
                      activeTab === "tab1"
                        ? "bg-[#09bc8a] text-white"
                        : "bg-[#f5f5f5] text-[#868686] hover:opacity-90"
                    }`}
                    onClick={() => setActiveTab("tab1")}
                  >
                    Bikes
                  </button>

                  <button
                    className={`flex-1 font-bold text-sm sm:text-base transition-colors ${
                      activeTab === "tab2"
                        ? "bg-[#09bc8a] text-white"
                        : "bg-[#f5f5f5] text-[#868686] hover:opacity-90"
                    }`}
                    onClick={() => setActiveTab("tab2")}
                  >
                    Peças e acessórios
                  </button>
                  </div>

                <div className="relative overflow-visible rounded-b-xl bg-white p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <input
                        type="search"
                        placeholder="Digite aqui o que você procura..."
                        className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm focus:outline-none sm:h-12 sm:text-base"
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void submitSearch();
                        }}
                      />
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                    <div ref={filterWrapRef} className="relative z-20">
                      <button
                        type="button"
                        onClick={() => setShowFilters((v) => !v)}
                        className={cn(
                          "flex h-11 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors sm:h-12 sm:px-4",
                          showFilters
                            ? "border-[#09bc8a] text-[#09bc8a] bg-[#09bc8a]/5"
                            : "border-gray-200 text-gray-700 bg-white hover:bg-gray-50",
                        )}
                        aria-label="Filtros"
                        title="Filtros"
                      >
                        <FaFilter className="w-4 h-4" />
                        <span className="hidden sm:inline">Filtros</span>

                        {activeFiltersCount > 0 && (
                          <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#09bc8a] text-white text-[11px] font-bold">
                            {activeFiltersCount}
                          </span>
                        )}

                        <FaChevronDown
                          className={`w-3 h-3 transition-transform ${
                            showFilters ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {showFilters && (
                        <div className="absolute right-0 top-full z-[70] mt-2 w-[min(calc(100vw-2rem),290px)] max-sm:left-0 max-sm:right-0 max-sm:w-full sm:w-[400px]">
                          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                            <div className="px-5 py-4 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-9 h-9 rounded-xl bg-[#09bc8a]/10 flex items-center justify-center">
                                  <FaFilter className="text-[#09bc8a]" />
                                </div>
                                <div>
                                  <p className="text-[15px] font-extrabold text-[#0c1b33] leading-tight">
                                    Filtros
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Refine sua busca rapidamente
                                  </p>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={clearFilters}
                                className="text-sm font-semibold text-[#09bc8a] hover:underline"
                              >
                                Limpar
                              </button>
                            </div>

                            <div className="px-5 pb-5">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FilterDropdownField
                                  id="filter-categoria"
                                  label="Categoria"
                                  value={filters.categoria}
                                  onChange={(categoria) =>
                                    setFilters((f) => ({ ...f, categoria }))
                                  }
                                  options={filtroCategorias.map((c) => ({
                                    value: c.id,
                                    label: c.name,
                                  }))}
                                  disabled={filtroCatalogoStatus !== "ready"}
                                />

                                <FilterDropdownField
                                  id="filter-marca"
                                  label="Marca"
                                  value={filters.marca}
                                  onChange={(marca) =>
                                    setFilters((f) => ({ ...f, marca }))
                                  }
                                  options={filtroMarcas.map((m) => ({
                                    value: m.id,
                                    label: m.name,
                                  }))}
                                  disabled={filtroCatalogoStatus !== "ready"}
                                />

                                {filtroCatalogoStatus === "error" && (
                                  <p
                                    className="text-xs text-red-600 sm:col-span-2"
                                    role="alert"
                                  >
                                    Não foi possível carregar categorias e
                                    marcas. Os demais filtros continuam
                                    disponíveis.
                                  </p>
                                )}
                                <FilterDropdownField
                                  id="filter-condicao"
                                  label="Condição"
                                  value={filters.condicao}
                                  onChange={(condicao) =>
                                    setFilters((f) => ({ ...f, condicao }))
                                  }
                                  options={CONDICAO_FILTER_OPTIONS}
                                />

                                <div>
                                  <label className="block text-xs font-bold text-gray-700 mb-2">
                                    Localização
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Cidade, Estado"
                                    value={filters.localizacao}
                                    onChange={(e) =>
                                      setFilters({
                                        ...filters,
                                        localizacao: e.target.value,
                                      })
                                    }
                                    className="w-full h-[42px] px-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#09bc8a] focus:border-transparent"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-bold text-gray-700 mb-2">
                                    Preço mín.
                                  </label>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                                      R$
                                    </span>
                                    <input
                                      type="number"
                                      placeholder="0"
                                      value={filters.precoMin}
                                      onChange={(e) =>
                                        setFilters({
                                          ...filters,
                                          precoMin: e.target.value,
                                        })
                                      }
                                      className="w-full h-[42px] pl-10 pr-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#09bc8a] focus:border-transparent"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-xs font-bold text-gray-700 mb-2">
                                    Preço máx.
                                  </label>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                                      R$
                                    </span>
                                    <input
                                      type="number"
                                      placeholder="Qualquer"
                                      value={filters.precoMax}
                                      onChange={(e) =>
                                        setFilters({
                                          ...filters,
                                          precoMax: e.target.value,
                                        })
                                      }
                                      className="w-full h-[42px] pl-10 pr-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#09bc8a] focus:border-transparent"
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-600">
                                    {activeFiltersCount} filtro(s) ativo(s)
                                  </span>
                                  {activeFiltersCount > 0 && (
                                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-[#09bc8a]/10 text-[#09bc8a] text-[11px] font-bold">
                                      Ativo
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setShowFilters(false)}
                                    className="px-3 py-2 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50"
                                  >
                                    Fechar
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigateToProdutosList(searchValue);
                                    }}
                                    className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#09bc8a] to-[#0c1b33] hover:opacity-90 transition-opacity"
                                  >
                                    Aplicar
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => submitSearch()}
                      className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[#078f6f] px-3 text-sm font-semibold text-white transition-colors hover:bg-[#067a60] sm:h-12 sm:flex-none sm:px-4"
                    >
                      <FaMagnifyingGlass className="h-4 w-4 shrink-0" />
                      <span>Pesquisar</span>
                    </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          ref={produtosBuscaInicioRef}
          className="mb-10 scroll-mt-[72px] md:mb-16 px-4 sm:px-5"
        >
          <div className="mx-auto max-w-[1200px]">

              {loadingProdutos && (
                <div className="mx-auto grid grid-cols-2 gap-4 py-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-[280px] animate-pulse rounded-xl bg-gray-100 sm:h-[300px]"
                      aria-hidden
                    />
                  ))}
                </div>
              )}

              {!loadingProdutos && produtosErro && (
                <div
                  className="mx-auto max-w-3xl rounded-md border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-800"
                  role="alert"
                >
                  {produtosErro}
                </div>
              )}

              {!loadingProdutos &&
                !produtosErro &&
                produtosFiltrados.length === 0 && (
                  <p className="mx-auto max-w-3xl py-6 text-center text-sm text-gray-600 sm:text-base">
                    Nenhum produto encontrado com os critérios atuais. Ajuste o
                    texto ou os filtros e pesquise novamente.
                  </p>
                )}

              {!loadingProdutos &&
                !produtosErro &&
                produtosFiltrados.length > 0 && (
                  <>
                    {favoriteError && (
                      <div
                        className="mx-auto mb-4 max-w-3xl rounded-md border border-red-200 bg-red-50 px-4 py-2 text-left text-sm text-red-800"
                        role="alert"
                      >
                        {favoriteError}
                      </div>
                    )}
                    <div className="mx-auto grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
                      {produtosPagina.map((p) => {
                        const href = `/produtos/${encodeURIComponent(String(p.id))}`;
                        return (
                          <HomeBuscaProdutoCard
                            key={String(p.id)}
                            p={p}
                            href={href}
                            favoriteIds={favoriteIds}
                            pendingFavoriteIds={pendingFavoriteIds}
                            onToggleFavorite={handleToggleFavorite}
                          />
                        );
                      })}
                    </div>

                    <div className="mt-10 rounded-b-xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
                      <div className="grid grid-cols-1 items-center gap-4 text-sm sm:grid-cols-3">
                        <div className="flex items-center justify-center gap-2 sm:justify-start">
                          {PAGE_SIZE_OPTIONS.map((opt) => {
                            const active = pageSize === opt;
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => {
                                  setPageSize(opt);
                                  setResultsPage(1);
                                }}
                                className={cn(
                                  "flex size-9 items-center justify-center rounded-lg border text-sm font-medium transition-colors",
                                  active
                                    ? "border-[#09bc8a] bg-[#09bc8a]/10 text-[#09bc8a]"
                                    : "border-gray-200 bg-white text-[#0c1b33] hover:border-[#09bc8a]/60 hover:text-[#09bc8a]",
                                )}
                                aria-pressed={active}
                                aria-label={`Mostrar ${opt} produtos por página`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>

                        <nav
                          className="flex items-center justify-center gap-3"
                          aria-label="Paginação dos resultados"
                        >
                          <button
                            type="button"
                            disabled={safeResultsPage <= 1}
                            onClick={() =>
                              setResultsPage((n) => Math.max(1, n - 1))
                            }
                            className="flex size-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-colors hover:border-[#09bc8a]/60 hover:text-[#09bc8a] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-gray-500"
                            aria-label="Página anterior"
                          >
                            <ChevronLeft className="size-4" aria-hidden />
                          </button>
                          <button
                            type="button"
                            disabled={safeResultsPage >= totalResultsPages}
                            onClick={() =>
                              setResultsPage((n) =>
                                Math.min(totalResultsPages, n + 1),
                              )
                            }
                            className="flex size-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-colors hover:border-[#09bc8a]/60 hover:text-[#09bc8a] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-gray-500"
                            aria-label="Próxima página"
                          >
                            <ChevronRight className="size-4" aria-hidden />
                          </button>
                        </nav>

                        <p className="text-center text-sm text-[#0c1b33] sm:text-right">
                          Página{" "}
                          <span className="font-semibold">
                            {safeResultsPage}
                          </span>{" "}
                          de{" "}
                          <span className="font-semibold">
                            {totalResultsPages}
                          </span>{" "}
                          ({produtosTotal}{" "}
                          {produtosTotal === 1 ? "item" : "itens"}
                          )
                        </p>
                      </div>
                    </div>
                  </>
                )}
            </div>
          </section>

        {/* Section 2 */}
        <section
          ref={brandsSectionRef}
          className="mb-10 md:mb-16 px-4 sm:px-5"
        >
          <h1 className="mb-5 mt-4 text-center text-xl font-bold text-gray-800 sm:mb-6 sm:text-2xl">
            Escolha por marca
          </h1>

          <div className="mx-auto w-full max-w-[980px]">
            <div
              className={cn(
                "grid w-full gap-5",
                "min-[1230px]:grid-cols-[minmax(0,700px)_220px] min-[1230px]:items-stretch min-[1230px]:gap-6",
              )}
            >
              <div className="mx-auto w-full max-w-[700px] min-[1230px]:mx-0 min-[1230px]:w-full">
                <div className="grid grid-cols-2 gap-2 p-1 sm:grid-cols-3 sm:gap-4">
                  {filtroCatalogoStatus === "loading" ? (
                    <div className="col-span-2 flex min-h-[140px] items-center justify-center gap-2 text-sm text-gray-600 sm:col-span-3 sm:min-h-[168px]">
                      <Loader2 className="size-5 shrink-0 animate-spin text-[#09bc8a]" />
                      <span>Carregando marcas…</span>
                    </div>
                  ) : filtroCatalogoStatus === "error" ? (
                    <div className="col-span-2 flex min-h-[140px] items-center justify-center px-2 text-center text-sm text-gray-600 sm:col-span-3 sm:min-h-[168px]">
                      Não foi possível carregar as marcas.
                    </div>
                  ) : marcasHomeOrdenadas.length === 0 ? (
                    <div className="col-span-2 flex min-h-[140px] items-center justify-center text-sm text-gray-500 sm:col-span-3 sm:min-h-[168px]">
                      Nenhuma marca disponível no momento.
                    </div>
                  ) : (
                    marcasVitrineVisiveis.map((marca) => {
                      const showLogo =
                        Boolean(marca.logo_url?.trim()) &&
                        !failedMarcaLogoIds.has(marca.id);
                      const isMarcaSelecionada =
                        filters.marca === String(marca.id);
                      return (
                        <button
                          type="button"
                          key={marca.id}
                          onClick={() => handleMarcaVitrineClick(marca)}
                          className="group flex min-h-0 w-full min-w-0 text-left"
                          aria-pressed={isMarcaSelecionada}
                          aria-label={`Ver produtos da marca ${marca.nome}`}
                        >
                          <div
                            className={cn(
                              "flex h-36 w-full items-center justify-center rounded-2xl border bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md",
                              isMarcaSelecionada
                                ? "border-[#09bc8a] shadow-md ring-2 ring-[#09bc8a]/25"
                                : "border-slate-100 hover:border-emerald-200",
                            )}
                          >
                            {showLogo ? (
                              <img
                                src={marca.logo_url!}
                                alt={marca.nome}
                                className="max-h-24 max-w-full object-contain"
                                loading="lazy"
                                decoding="async"
                                onError={() => {
                                  setFailedMarcaLogoIds((prev) => {
                                    const next = new Set(prev);
                                    next.add(marca.id);
                                    return next;
                                  });
                                }}
                              />
                            ) : (
                              <span className="line-clamp-3 px-1 text-center text-sm font-semibold text-slate-700">
                                {marca.nome}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <aside className="hidden min-h-[200px] min-[1230px]:flex min-[1230px]:w-full flex-col rounded-2xl border border-slate-100 bg-slate-100 shadow-sm">
                <div className="flex min-h-full flex-1 flex-col items-center justify-center px-4 py-8">
                  <p className="text-base font-bold text-slate-700 sm:text-lg">
                    Anúncio
                  </p>
                </div>
              </aside>
            </div>

            {filtroCatalogoStatus === "ready" &&
              marcasHomeOrdenadas.length > MARCAS_VITRINE_INICIAL && (
                <div className="mt-5 flex justify-center">
                  <button
                    type="button"
                    onClick={() =>
                      setMarcasVitrineExpanded((wasExpanded) => {
                        if (wasExpanded) {
                          requestAnimationFrame(() => {
                            requestAnimationFrame(() => {
                              scrollHomeProdutosSectionToTop(
                                brandsSectionRef.current,
                              );
                            });
                          });
                        }
                        return !wasExpanded;
                      })
                    }
                    className="text-sm font-semibold text-[#09bc8a] underline-offset-4 transition hover:text-[#0c1b33] hover:underline"
                  >
                    {marcasVitrineExpanded
                      ? "Ver menos marcas"
                      : "Ver mais marcas"}
                  </button>
                </div>
              )}

            <div className="mt-6 flex h-[120px] w-full items-center justify-center rounded-2xl border border-slate-100 bg-slate-100 shadow-sm min-[1230px]:hidden">
              <p className="text-base font-bold text-slate-700">Anúncio</p>
            </div>
          </div>
        </section>

        {/* Section 3 - Destaque da semana */}
        <section className="mb-10 md:mb-16 text-center px-4">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-5">
            Destaque da semana
          </h1>

          {lancamentosStatus === "loading" && (
            <div className="mx-auto max-w-[1200px]">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
                {Array.from({ length: LANCAMENTOS_VITRINE_MAX }).map((_, i) => (
                  <div
                    key={i}
                    className="min-h-[360px] animate-pulse rounded-xl border border-gray-100 bg-gray-100"
                    aria-hidden
                  />
                ))}
              </div>
            </div>
          )}

          {lancamentosStatus === "error" && lancamentosError && (
            <p className="mx-auto max-w-2xl py-4 text-center text-sm text-slate-500">
              {lancamentosError}
            </p>
          )}

          {lancamentosStatus === "ready" && lancamentos.length === 0 && (
            <p className="mx-auto max-w-2xl py-4 text-center text-sm text-slate-500">
              Nenhum lançamento disponível no momento.
            </p>
          )}

          {lancamentosStatus === "ready" && lancamentos.length > 0 && (
            <div className="mx-auto max-w-[1200px]">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
                {lancamentos.map((raw) => {
                  const p = itemUnknownToListaView(raw);
                  if (!p) return null;
                  const href = `/produtos/${encodeURIComponent(String(p.id))}`;
                  return (
                    <HomeBuscaProdutoCard
                      key={String(p.id)}
                      p={p}
                      href={href}
                      favoriteIds={favoriteIds}
                      pendingFavoriteIds={pendingFavoriteIds}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-gray-100 h-[150px] sm:h-[220px] w-full max-w-[920px] mx-auto mt-8 sm:mt-10 mb-8 sm:mb-10 rounded-md shadow-md flex items-center justify-center">
            <h5 className="text-base sm:text-lg font-bold">Anúncio</h5>
          </div>
        </section>

        {/* Section 4 - Estilos */}
        <section className="bg-[#09bc8a] py-10 sm:py-16 px-4">
          <div className="mx-auto flex w-full max-w-[1100px] flex-col items-center justify-center lg:flex-row lg:items-center">
            <div className="w-full shrink-0 text-center text-white lg:w-1/3 lg:text-left">
              <h1 className="mb-6 flex flex-col gap-0.5 sm:mb-10 sm:gap-1 lg:mb-0">
                <span className="block text-2xl font-light uppercase tracking-wide leading-none md:text-3xl lg:text-4xl">
                  QUAL O SEU
                </span>
                <span className="block text-5xl font-extrabold uppercase leading-none md:text-6xl lg:text-7xl">
                  ESTILO?
                </span>
              </h1>
            </div>
            <div className="w-full min-w-0 lg:w-2/3">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 justify-items-center lg:pr-3">
                {filtroCatalogoStatus === "error" && (
                  <p className="col-span-full max-w-md text-center text-sm font-medium leading-relaxed text-white/95">
                    Não foi possível carregar o catálogo. Tente atualizar a
                    página.
                  </p>
                )}

                {filtroCatalogoStatus !== "error" &&
                  (filtroCatalogoStatus === "loading" ||
                    (filtroCatalogoStatus === "ready" &&
                      estiloVitrineStatus !== "ready" &&
                      estiloVitrineStatus !== "error")) && (
                  <>
                    {Array.from({ length: ESTILO_BIKES_VITRINE_MAX }).map(
                      (_, i) => (
                        <div
                          key={i}
                          className="mx-auto h-[250px] w-full animate-pulse rounded-lg bg-white/35 sm:h-[280px] sm:w-[200px] md:w-[220px]"
                          aria-hidden
                        />
                      ),
                    )}
                  </>
                )}

                {filtroCatalogoStatus === "ready" &&
                  estiloVitrineStatus === "error" &&
                  estiloVitrineErro && (
                    <p className="col-span-full max-w-md text-center text-sm font-medium leading-relaxed text-white/95">
                      {estiloVitrineErro}
                    </p>
                  )}

                {filtroCatalogoStatus === "ready" &&
                  estiloVitrineStatus === "ready" &&
                  estiloVitrineSemCategoria && (
                    <p className="col-span-full max-w-md text-center text-sm font-medium leading-relaxed text-white/95">
                      Nenhuma categoria de bicicletas foi encontrada no catálogo.
                    </p>
                  )}

                {filtroCatalogoStatus === "ready" &&
                  estiloVitrineStatus === "ready" &&
                  !estiloVitrineSemCategoria &&
                  estiloVitrineProdutos.length === 0 && (
                    <p className="col-span-full max-w-md text-center text-sm font-medium leading-relaxed text-white/95">
                      Nenhuma bicicleta disponível no momento.
                    </p>
                  )}

                {filtroCatalogoStatus === "ready" &&
                  estiloVitrineStatus === "ready" &&
                  !estiloVitrineSemCategoria &&
                  estiloVitrineProdutos.length > 0 &&
                  estiloVitrineProdutos.map((p) => {
                    const href = `/produtos/${encodeURIComponent(String(p.id))}`;
                    return (
                      <Link
                        to={href}
                        key={String(p.id)}
                        className="mx-auto h-[250px] w-full sm:h-[280px] sm:w-[200px] md:w-[220px]"
                      >
                        <div className="flex h-full flex-col rounded-lg bg-white p-3 shadow-md sm:p-4">
                          <div className="relative flex-1">
                            {p.imagemUrl ? (
                              <img
                                src={p.imagemUrl}
                                alt={p.titulo}
                                className="absolute inset-0 h-full w-full object-contain p-3 sm:p-4"
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-4">
                                <FaBicycle
                                  className="text-gray-200"
                                  aria-hidden
                                  size={64}
                                />
                              </div>
                            )}
                          </div>
                          <h5 className="mt-2 truncate text-center text-sm font-bold text-[#09bc8a] sm:text-base">
                            {p.titulo}
                          </h5>
                          <button
                            type="button"
                            tabIndex={-1}
                            className="pointer-events-none mt-2 flex items-center justify-center gap-1 rounded bg-gradient-to-r from-[#09bc8a] to-[#0c1b33] py-2 text-sm font-bold text-white hover:opacity-90 sm:mt-3 sm:gap-2 sm:text-base"
                          >
                            Confira <FaArrowRightToBracket />
                          </button>
                        </div>
                      </Link>
                    );
                  })}
              </div>
            </div>
          </div>
        </section>

        {/* Section 5 - Selecionados para você */}
        <section className="my-10 sm:my-16 text-center px-4">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-5">
            Olha o que selecionamos pra você
          </h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 justify-center max-w-4xl mx-auto">
            {[1, 2, 3, 4].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-md shadow-md w-full max-w-[350px] h-[330px] sm:h-[380px] p-3 sm:p-4 flex flex-col mx-auto"
              >
                <div className="relative w-full h-[140px] sm:h-[180px]">
                  <img
                    src="/img/highlight.png"
                    alt={`Produto ${i + 1}`}
                    className="absolute inset-0 h-full w-full object-contain p-3 sm:p-4"
                  />
                </div>
                <div className="flex justify-between items-center mt-3 sm:mt-4">
                  <h5 className="text-lg sm:text-xl font-bold">
                    Produto {i + 1}
                  </h5>
                  <span className="text-xl sm:text-2xl font-bold text-[#09bc8a]">
                    R$ 999
                  </span>
                </div>
                <a
                  href="#"
                  className="mt-3 sm:mt-4 bg-gradient-to-r from-[#09bc8a] to-[#0c1b33] text-white py-2 px-4 rounded font-bold text-center hover:opacity-90 text-sm sm:text-base"
                >
                  Adicionar ao carrinho
                </a>
              </div>
            ))}
          </div>
          <div className="bg-gray-100 h-[150px] sm:h-[220px] w-full max-w-[920px] mx-auto mt-8 sm:mt-10 mb-8 sm:mb-10 rounded-md shadow-md flex items-center justify-center">
            <h5 className="text-base sm:text-lg font-bold">Anúncio</h5>
          </div>
        </section>

        {/* Section 6 - Mais procurados */}
        <section className="bg-[#ebf1f0] py-10 sm:py-16 px-4">
          <div className="text-center">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-5">
              Mais Procurados
            </h1>
            <div className="flex justify-center">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 w-full max-w-[1400px]">
                {[1, 2, 3, 4].map((_, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-md shadow-md w-full max-w-[350px] h-[330px] sm:h-[380px] p-3 sm:p-4 flex flex-col mx-auto"
                  >
                    <div className="relative w-full h-[140px] sm:h-[180px]">
                      <img
                        src="/img/highlight.png"
                        alt={`Produto ${i + 1}`}
                        className="absolute inset-0 h-full w-full object-contain p-3 sm:p-4"
                      />
                    </div>
                    <div className="flex justify-between items-center mt-3 sm:mt-4">
                      <h5 className="text-lg sm:text-xl font-bold">
                        Produto {i + 1}
                      </h5>
                      <span className="text-xl sm:text-2xl font-bold text-[#09bc8a]">
                        R$ 999
                      </span>
                    </div>
                    <a
                      href="#"
                      className="mt-3 sm:mt-4 bg-gradient-to-r from-[#09bc8a] to-[#0c1b33] text-white py-2 px-4 rounded font-bold text-center hover:opacity-90 text-sm sm:text-base"
                    >
                      Adicionar ao carrinho
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Section 7 - Instagram */}
        <section className="py-10 sm:py-16 text-center px-4">
          <h2 className="text-lg sm:text-xl font-bold text-[#0C1B33] mb-6 sm:mb-8">
            Confira nosso Instagram
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 max-w-4xl mx-auto mb-6 sm:mb-8">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-[#09BC8A] aspect-square rounded-lg"
              ></div>
            ))}
          </div>
          <a href="https://www.instagram.com/bikescombr/">
            <button className="bg-gradient-to-r from-[#09BC8A] to-[#0C1B33] text-white py-2 px-4 sm:px-6 rounded font-bold flex items-center justify-center gap-2 mx-auto hover:opacity-90 text-sm sm:text-base">
              📷 Siga-nos agora
            </button>
          </a>
        </section>
      </main>

      <Footer />
    </div>
  );
};
