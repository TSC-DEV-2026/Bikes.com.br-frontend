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
import { Link, useSearchParams } from "react-router-dom";

import { listCategorias, listMarcas } from "@/api/endpoints/catalogo.routes";
import { listProdutos } from "@/api/endpoints/produtos.routes";
import {
  addFavorito,
  listFavoritos,
  removeFavorito,
} from "@/api/endpoints/favoritos.routes";
import type { ProdutoId, ProdutoListaView } from "@/types/produto";
import { normalizeProdutosListResponseWithMeta } from "@/types/produto";
import { favoriteIdsFromListPayload } from "@/types/favorito";
import { produtosSearchFromUserPhrase } from "@/lib/produtos-search";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/auth-context";
import { useFavoritesCount } from "@/contexts/favorites-count-context";
import LandingPage from "@/pages/landing/landing-page";

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
  { value: "seminovo", label: "Seminovo" },
  { value: "usado", label: "Usado" },
] as const;

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

/** Exibe preço no estilo da busca: R$ e centavos menores, inteiro em destaque. */
function PrecoBusca({
  precoTexto,
  className,
}: {
  precoTexto: string | null;
  className?: string;
}) {
  const raw = precoTexto?.trim();
  if (!raw) {
    return (
      <p className={cn("mt-3 text-sm font-medium text-gray-500", className)}>
        Preço sob consulta
      </p>
    );
  }

  const m = raw.match(/^R\$\s*([\d.]+)(,\d{2})?$/i);
  if (m) {
    const [, intPart, decPart] = m;
    return (
      <div
        className={cn(
          "mt-3 flex items-start justify-center gap-0.5 text-[#09bc8a]",
          className,
        )}
      >
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
    <p
      className={cn(
        "mt-3 text-xl font-bold leading-tight text-[#09bc8a] sm:text-2xl",
        className,
      )}
    >
      {raw}
    </p>
  );
}

const PAGE_SIZE_OPTIONS = [5, 10, 20] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];
const DEFAULT_PAGE_SIZE: PageSize = 5;

const AuthenticatedHome = () => {
  const { isAuthenticated } = useAuth();
  const { refreshFavoriteCount } = useFavoritesCount();

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
  const [filtroCatalogoStatus, setFiltroCatalogoStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");

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
        setFiltroCatalogoStatus("ready");
      } catch {
        if (!cancelled) {
          setFiltroCategorias([]);
          setFiltroMarcas([]);
          setFiltroCatalogoStatus("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const [searchParams, setSearchParams] = useSearchParams();

  const cardSection2Data = [
    { image: "/img/card1.png", link: "/home" },
    { image: "/img/card2.png", link: "/home" },
    { image: "/img/card3.png", link: "/home" },
    { image: "/img/card4.png", link: "/home" },
    { image: "/img/card5.png", link: "/home" },
    { image: "/img/card6.png", link: "/home" },
  ];

  const cardSection4Data = [
    { image: "/img/style.png", link: "/home", title: "MOUNTAIN BIKE" },
    { image: "/img/style.png", link: "/home", title: "TRIATHLON" },
    { image: "/img/style.png", link: "/home", title: "TRIAL" },
    { image: "/img/style.png", link: "/home", title: "BIKES ANTIGAS" },
    { image: "/img/style.png", link: "/home", title: "BIKE ELÉTRICA" },
    { image: "/img/style.png", link: "/home", title: "SPEED" },
  ];

  const activeFiltersCount = useMemo(() => {
    return Object.values(filters).filter((v) => String(v ?? "").trim() !== "")
      .length;
  }, [filters]);
  const hasSearchOrFilters =
    (searchParams.get("search")?.trim() ?? "") !== "" || activeFiltersCount > 0;

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

  const runProductQuery = useCallback(async (
    term: string,
    page: number,
    currentPageSize: PageSize,
  ) => {
    setShowFilters(false);
    setSearchSubmitted(true);
    setLoadingProdutos(true);
    setProdutosErro(null);
    try {
      const currentFilters = filtersRef.current;
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
    const q = searchParams.get("search")?.trim() ?? "";
    setSearchValue(q);
    void runProductQuery(q, resultsPage, pageSize);
  }, [searchParams, resultsPage, pageSize, runProductQuery]);

  const safeResultsPage = Math.min(resultsPage, totalResultsPages);

  const produtosPagina = useMemo(() => {
    return produtosFiltrados;
  }, [produtosFiltrados]);

  const submitSearch = useCallback(() => {
    const term = searchValue.trim();
    setResultsPage(1);
    setSearchParams(term ? { search: term } : {});
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
    const q = searchParams.get("search")?.trim() ?? "";
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
  const skipPaginationScrollRef = useRef(true);

  useEffect(() => {
    if (!searchSubmitted) return;
    if (skipPaginationScrollRef.current) {
      skipPaginationScrollRef.current = false;
      return;
    }
    produtosBuscaInicioRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [resultsPage, pageSize, searchSubmitted]);

  return (
    <div className="font-sans m-0 p-0">
      <div className="relative z-[2000]">
        <Header />
      </div>

      <main className="mt-[60px]">
        <section id="home" className="relative max-md:mb-28 md:mb-32">
          <div className="relative w-full h-[300px] sm:h-[400px] md:h-[500px]">
            <img
              src="/img/fundo-home.png"
              alt="Fundo"
              className="absolute inset-0 h-full w-full object-cover"
              fetchPriority="high"
            />

            <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-4">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[40px] font-bold font-gill-sans mb-4 sm:mb-6 md:mb-8">
                Seu principal marketplace de bikes
              </h1>
            </div>

            <div className="absolute -bottom-12 sm:-bottom-16 left-0 right-0 z-[50] px-4 sm:px-6">
              <div className="bg-white rounded-xl shadow-lg w-full max-w-[750px] mx-auto">
                <div className="flex w-full h-[35px] sm:h-[40px] rounded-tl-lg overflow-hidden">
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

                  <button
                    type="button"
                    disabled={loadingProdutos}
                    onClick={() => submitSearch()}
                    className="w-[110px] sm:w-[160px] bg-gradient-to-r from-[#09bc8a] to-[#0c1b33] text-white font-bold flex items-center justify-center gap-2 hover:from-[#08ab7d] hover:to-[#0a172e] rounded-tr-lg text-sm sm:text-base disabled:opacity-60 disabled:pointer-events-none"
                  >
                    <FaMagnifyingGlass className="text-lg sm:text-xl" />
                    <span>Pesquisar</span>
                  </button>
                </div>

                <div className="relative p-3 sm:p-4">
                  <div className="flex gap-2 items-center">
                    <div className="flex-1 relative">
                      <input
                        type="search"
                        placeholder="Digite aqui o que você procura..."
                        className="w-full h-[40px] sm:h-[44px] px-4 rounded-lg border border-gray-200 text-sm sm:text-base focus:outline-none  bg-white"
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void submitSearch();
                        }}
                      />
                    </div>

                    <div ref={filterWrapRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setShowFilters((v) => !v)}
                        className={`h-[40px] sm:h-[44px] px-3 sm:px-4 rounded-lg border text-sm font-semibold flex items-center gap-2 transition-colors
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
                        <div className="absolute -right-3 mt-2 z-[60] w-[290px] sm:w-[400px]">
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
                  </div>

                  <div className="mt-2 text-[12px] text-gray-500 flex items-center justify-between">
                    <span>
                      Dica: pressione{" "}
                      <span className="font-semibold">Enter</span> para
                      pesquisar
                    </span>
                    {activeFiltersCount > 0 && (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="text-[#09bc8a] font-semibold hover:underline"
                      >
                        Limpar filtros
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {searchSubmitted && (
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
                    <div className="mx-auto grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
                      {produtosPagina.map((p) => {
                        const href = `/produtos/${encodeURIComponent(String(p.id))}`;
                        const key = String(p.id);
                        const isFav = favoriteIds.has(key);
                        const isFavPending = pendingFavoriteIds.has(key);
                        return (
                          <article
                            key={key}
                            className="flex h-full min-h-[360px] flex-col items-center rounded-xl border border-gray-100 bg-white px-4 pb-5 pt-4 text-center shadow-sm"
                          >
                            <div className="relative mb-4 w-full">
                              <Link
                                to={href}
                                className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-lg bg-gray-50"
                              >
                                {p.imagemUrl ? (
                                  <img
                                    src={p.imagemUrl}
                                    alt=""
                                    className="h-full w-full object-contain p-2"
                                  />
                                ) : (
                                  <FaBicycle
                                    className="text-gray-200"
                                    aria-hidden
                                    size={72}
                                  />
                                )}
                              </Link>

                              <button
                                type="button"
                                onClick={() => void handleToggleFavorite(p.id)}
                                disabled={isFavPending}
                                aria-pressed={isFav}
                                aria-label={
                                  isFav
                                    ? "Remover dos favoritos"
                                    : "Adicionar aos favoritos"
                                }
                                title={
                                  isFav
                                    ? "Remover dos favoritos"
                                    : "Adicionar aos favoritos"
                                }
                                className={cn(
                                  "absolute right-2 top-2 inline-flex size-9 items-center justify-center rounded-full border bg-white/95 shadow-sm transition-colors disabled:opacity-60",
                                  isFav
                                    ? "border-red-200 text-red-500 hover:bg-red-50"
                                    : "border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-red-500",
                                )}
                              >
                                {isFavPending ? (
                                  <Loader2
                                    className="size-4 animate-spin"
                                    aria-hidden
                                  />
                                ) : (
                                  <Heart
                                    className={cn(
                                      "size-4",
                                      isFav && "fill-red-500",
                                    )}
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
                                className="mt-0"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => void handleToggleFavorite(p.id)}
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

        {/* Section 2 */}
        <section className="mb-10 md:mb-16 px-4 sm:px-5 text-center">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 mt-4 sm:mb-5">
            Escolha por marca
          </h1>

          {/* FIX: reestruturação para manter JSX balanceado */}
          <div className="relative flex justify-center">
            <div className="grid grid-cols-3 p-2 sm:gap-5 max-sm:gap-2 w-full max-w-[700px]">
              {cardSection2Data.map((card, index) => (
                <Link
                  to={card.link}
                  key={index}
                  className="w-full h-[120px] sm:h-[160px] mx-auto"
                >
                  <div className="bg-white rounded-md shadow-md relative gap-3 w-full h-full overflow-hidden">
                    <img
                      src={card.image}
                      alt={`Marca ${index + 1}`}
                      className="absolute inset-0 h-full w-full object-contain p-3 sm:p-4"
                    />
                  </div>
                </Link>
              ))}
            </div>

            {/* Anúncio lateral (desktop) */}
            <div
              className="hidden min-[1230px]:flex ml-6
                         w-[120px] sm:w-[150px] md:w-[180px] lg:w-[220px]
                         h-[250px] sm:h-[280px] md:h-[330px] lg:h-[360px]
                         bg-gray-100 rounded-md shadow-md items-center justify-center"
            >
              <h5 className="text-base sm:text-lg font-bold">Anúncio</h5>
            </div>
          </div>

          {/* Anúncio (mobile/tablet) */}
          <div className="min-[1230px]:hidden w-auto h-[120px] mt-6 bg-gray-100 rounded-md shadow-md flex items-center justify-center">
            <h5 className="text-base font-bold">Anúncio</h5>
          </div>
        </section>

        {/* Section 3 - Destaque da semana */}
        <section className="mb-10 md:mb-16 text-center px-4">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-5">
            Destaque da semana
          </h1>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5">
            {[1, 2].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-md shadow-md w-full max-w-[450px] h-[350px] sm:h-[400px] p-3 sm:p-4 flex flex-col"
              >
                <div className="relative w-full h-[150px] sm:h-[200px]">
                  <img
                    src="/img/highlight.png"
                    alt="Produto destaque"
                    className="absolute inset-0 h-full w-full object-contain p-3 sm:p-4"
                  />
                </div>
                <div className="flex justify-between items-center mt-3 sm:mt-4">
                  <h5 className="text-lg sm:text-xl font-bold">
                    Garmin Edge 530
                  </h5>
                  <span className="text-xl sm:text-2xl font-bold text-[#09bc8a]">
                    R$ 1.299
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

        {/* Section 4 - Estilos */}
        <section className="bg-[#09bc8a] py-10 sm:py-16 px-4">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-6 sm:mb-10">
              QUAL O SEU <span className="font-black">ESTILO?</span>
            </h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 justify-center max-w-5xl mx-auto">
              {cardSection4Data.map((card, index) => (
                <Link
                  to={card.link}
                  key={index}
                  className="w-full sm:w-[200px] md:w-[220px] h-[250px] sm:h-[280px] mx-auto"
                >
                  <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 flex flex-col h-full">
                    <div className="relative flex-1">
                      <img
                        src={card.image}
                        alt={card.title}
                        className="absolute inset-0 h-full w-full object-contain p-3 sm:p-4"
                      />
                    </div>
                    <h5 className="font-bold text-[#09bc8a] mt-2 text-center truncate text-sm sm:text-base">
                      {card.title}
                    </h5>
                    <button className="mt-2 sm:mt-3 bg-gradient-to-r from-[#09bc8a] to-[#0c1b33] text-white py-2 rounded font-bold flex items-center justify-center gap-1 sm:gap-2 hover:opacity-90 text-sm sm:text-base">
                      Confira <FaArrowRightToBracket />
                    </button>
                  </div>
                </Link>
              ))}
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

export default function Home() {
  const { bootstrapped, isAuthenticated } = useAuth();

  if (!bootstrapped) {
    return <div className="min-h-screen bg-white" />;
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return <AuthenticatedHome />;
}
