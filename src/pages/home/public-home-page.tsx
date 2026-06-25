import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  FaMagnifyingGlass,
  FaArrowRightToBracket,
  FaFilter,
  FaChevronDown,
  FaBicycle,
} from "react-icons/fa6";
import { ChevronLeft, ChevronRight, ChevronDown, Check, Loader2 } from "lucide-react";
import { Header } from "../../components/header";
import { Footer } from "../../components/footer";
import { Link, useLocation, useSearchParams } from "react-router-dom";

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
import {
  readSearchQueryParam,
  writeSearchQueryParam,
} from "@/lib/search-query-params";
import { ProdutoVitrineCard } from "@/components/produto/produto-vitrine-card";
import { LandingHero } from "@/components/landing/LandingHero";
import { BenefitsSection } from "@/components/landing/LandingSections";
import { UltimosAnunciosSection } from "@/components/produto/ultimos-anuncios-section";
import { MarketplaceTrustStrip } from "@/components/produto/marketplace-trust-strip";
import { cn } from "@/lib/utils";
import { PUBLIC_MARKETPLACE_CONTAINER_CLASS, PUBLIC_MARKETPLACE_HEADER_OFFSET_CLASS } from "@/lib/public-marketplace-routes";
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
const HOME_ULTIMOS_ANUNCIOS_MAX = 12;

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

/** Header fixo + faixa de busca compacta. */
const HOME_PRODUTOS_SCROLL_TOP_OFFSET_PX = 168;

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

const PAGE_SIZE_OPTIONS = [5, 10, 20] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];
const DEFAULT_PAGE_SIZE: PageSize = 5;

export function PublicHomePage() {
  const { isAuthenticated } = useAuth();
  const { refreshFavoriteCount } = useFavoritesCount();
  const location = useLocation();

  const loginNextHref = `/login?next=${encodeURIComponent(`${location.pathname}${location.search}`)}`;

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
      if (!isAuthenticated) return;

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
    [favoriteIds, pendingFavoriteIds, refreshFavoriteCount, isAuthenticated],
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

  const [searchParams, setSearchParams] = useSearchParams();

  const activeFiltersCount = useMemo(() => {
    return Object.values(filters).filter((v) => String(v ?? "").trim() !== "")
      .length;
  }, [filters]);
  const hasSearchOrFilters =
    readSearchQueryParam(searchParams) !== "" || activeFiltersCount > 0;

  const [searchSubmitted, setSearchSubmitted] = useState(false);
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
    term: string,
    page: number,
    currentPageSize: PageSize,
  ) => {
    setShowFilters(false);
    const currentFilters = filtersRef.current;
    const hasFilters = Object.values(currentFilters).some(
      (v) => String(v ?? "").trim() !== "",
    );
    if (term.trim() || hasFilters) {
      setSearchSubmitted(true);
    }
    setLoadingProdutos(true);
    setProdutosErro(null);
    try {
      const fromPhrase = produtosSearchFromUserPhrase(term);
      const res = await listProdutos({
        ...(fromPhrase
          ? {
              q: fromPhrase.q,
              ...(fromPhrase.indexador
                ? { indexador: fromPhrase.indexador }
                : {}),
            }
          : {}),
        categoria_id: parsePositiveInt(currentFilters.categoria),
        marca_id: parsePositiveInt(currentFilters.marca),
        preco_min: parsePositiveFloat(currentFilters.precoMin),
        preco_max: parsePositiveFloat(currentFilters.precoMax),
        condicao: currentFilters.condicao || undefined,
        ordenacao: "recentes",
        page,
        page_size: currentPageSize,
      });
      const { items, meta } = normalizeProdutosListResponseWithMeta(res.data);
      let base = items;

      // A API não expõe filtro de localização; mantém esse refinamento local.
      if (currentFilters.localizacao.trim()) {
        base = applyHomeFilters(
          base,
          {
            categoria: "",
            marca: "",
            condicao: "",
            precoMin: "",
            precoMax: "",
            localizacao: currentFilters.localizacao,
          },
          [] as FiltroSelectOption[],
          [] as FiltroSelectOption[],
        );
      }

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

  useEffect(() => {
    const q = readSearchQueryParam(searchParams);
    setSearchValue(q);
    if (q !== "" || activeFiltersCount > 0) {
      void runProductQuery(q, resultsPage, pageSize);
    } else {
      setSearchSubmitted(false);
      setProdutosFiltrados([]);
      setProdutosTotal(0);
      setTotalResultsPages(1);
      setProdutosErro(null);
      setLoadingProdutos(false);
    }
  }, [searchParams, resultsPage, pageSize, activeFiltersCount, runProductQuery]);

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
    const term = searchValue.trim();
    setResultsPage(1);
    setSearchParams(writeSearchQueryParam(term));
  }, [searchValue, setSearchParams]);

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
    const q = readSearchQueryParam(searchParams);
    if (resultsPage !== 1) {
      setResultsPage(1);
      return;
    }
    void runProductQuery(q, 1, pageSize);
  }, [pageSize, resultsPage, runProductQuery, searchParams]);

  const clearSearchResults = useCallback(() => {
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
    setSearchValue("");
    setResultsPage(1);
    setSearchParams({});
    // Garante a busca global imediata, mesmo se a URL já estava sem ?search.
    void runProductQuery("", 1, pageSize);
  }, [pageSize, runProductQuery, setSearchParams]);

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
      const marcaIdStr = String(marca.id);
      const nextFilters = { ...filtersRef.current, marca: marcaIdStr };
      filtersRef.current = nextFilters;
      setFilters(nextFilters);
      setResultsPage(1);
      const q = readSearchQueryParam(searchParams);
      void runProductQuery(q, 1, pageSize);
      requestAnimationFrame(() => {
        scrollHomeProdutosSectionToTop(produtosBuscaInicioRef.current);
      });
    },
    [pageSize, runProductQuery, searchParams],
  );

  useEffect(() => {
    if (!searchSubmitted) return;
    if (skipPaginationScrollRef.current) {
      skipPaginationScrollRef.current = false;
      return;
    }
    scrollHomeProdutosSectionToTop(produtosBuscaInicioRef.current);
  }, [resultsPage, pageSize, searchSubmitted]);

  return (
    <div className="font-sans m-0 p-0">
      <div className="relative z-[2000]">
        <Header />
      </div>

      <main className={hasSearchOrFilters ? PUBLIC_MARKETPLACE_HEADER_OFFSET_CLASS : undefined}>
        {!hasSearchOrFilters ? (
          <>
            <LandingHero carouselMax={10} uniformCards />
            <div className={PUBLIC_MARKETPLACE_CONTAINER_CLASS}>
              <UltimosAnunciosSection
                max={HOME_ULTIMOS_ANUNCIOS_MAX}
                compact
                uniformCards
                favoriteIds={favoriteIds}
                pendingFavoriteIds={pendingFavoriteIds}
                onToggleFavorite={handleToggleFavorite}
                loginHref={loginNextHref}
              />
            </div>
          </>
        ) : (
        <section id="home" className="border-b border-gray-100 bg-gradient-to-b from-[#09bc8a]/10 via-[#f4fbf8] to-white px-4 py-2 sm:px-5 sm:py-3">
          <div className="mx-auto w-full max-w-[850px]">
            <p className="mb-1.5 text-center text-xs font-bold uppercase tracking-wide text-[#09bc8a] sm:text-sm">
              Marketplace de bikes
            </p>
            <MarketplaceTrustStrip className="mb-1.5" />
            <div className="overflow-visible rounded-xl bg-white shadow-md ring-1 ring-gray-100">
                <div className="flex h-9 w-full overflow-hidden rounded-t-xl sm:h-10">
                  <button
                    className={`flex-1 text-sm font-bold transition-colors sm:text-base ${
                      activeTab === "tab1"
                        ? "bg-[#09bc8a] text-white"
                        : "bg-[#f5f5f5] text-[#868686] hover:opacity-90"
                    }`}
                    onClick={() => setActiveTab("tab1")}
                  >
                    Bikes
                  </button>

                  <button
                    className={`flex-1 text-sm font-bold transition-colors sm:text-base ${
                      activeTab === "tab2"
                        ? "bg-[#09bc8a] text-white"
                        : "bg-[#f5f5f5] text-[#868686] hover:opacity-90"
                    }`}
                    onClick={() => setActiveTab("tab2")}
                  >
                    Peças e acessórios
                  </button>
                  </div>

                <div className="relative overflow-visible rounded-b-xl bg-white p-3 sm:p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <input
                        type="search"
                        placeholder="Digite aqui o que você procura..."
                        className="h-10 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm focus:outline-none sm:h-11 sm:text-base"
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
                        className={`flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors sm:h-11 sm:px-4
                        ${
                          showFilters
                            ? "border-[#09bc8a] text-[#09bc8a] bg-[#09bc8a]/5"
                            : "border-gray-200 text-gray-700 bg-white hover:bg-gray-50"
                        }`}
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
                                    disabled={loadingProdutos}
                                    onClick={() => {
                                      setResultsPage(1);
                                      void runProductQuery(
                                        searchValue.trim(),
                                        1,
                                        pageSize,
                                      );
                                    }}
                                    className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#09bc8a] to-[#0c1b33] hover:opacity-90 transition-opacity disabled:opacity-60"
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
                      disabled={loadingProdutos}
                      onClick={() => submitSearch()}
                      className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-[#078f6f] px-3 text-sm font-semibold text-white transition-colors hover:bg-[#067a60] disabled:pointer-events-none disabled:opacity-60 sm:h-11 sm:flex-none sm:px-4"
                    >
                      <FaMagnifyingGlass className="h-4 w-4 shrink-0" />
                      <span>Pesquisar</span>
                    </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
        </section>
        )}

        {hasSearchOrFilters && searchSubmitted && (
          <section
            ref={produtosBuscaInicioRef}
            className="mb-10 scroll-mt-[72px] md:mb-16 px-4 sm:px-5"
          >
            <div className="mx-auto max-w-[1200px]">
              <div className="relative mb-8 text-center">
                <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
                  Resultado da busca
                </h2>
                {hasSearchOrFilters && (
                  <button
                    type="button"
                    onClick={clearSearchResults}
                    className="mt-2 text-sm font-semibold text-[#09bc8a] hover:underline sm:absolute sm:right-0 sm:top-1 sm:mt-0"
                  >
                    Limpar busca
                  </button>
                )}
              </div>

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
                    <div className="mx-auto grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
                      {produtosPagina.map((p) => {
                        const href = `/produtos/${encodeURIComponent(String(p.id))}`;
                        return (
                          <div key={String(p.id)} className="flex h-full min-w-0">
                          <ProdutoVitrineCard
                            produto={p}
                            href={href}
                            favoriteIds={favoriteIds}
                            pendingFavoriteIds={pendingFavoriteIds}
                            onToggleFavorite={handleToggleFavorite}
                            loginHref={
                              isAuthenticated ? undefined : loginNextHref
                            }
                          />
                          </div>
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
        )}

        <BenefitsSection />

      </main>

      <Footer />
    </div>
  );
};
