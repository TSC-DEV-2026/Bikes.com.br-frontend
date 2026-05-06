import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaMagnifyingGlass,
  FaArrowRightToBracket,
  FaFilter,
  FaChevronDown,
} from "react-icons/fa6";
import { Header } from "../../components/header";
import { Footer } from "../../components/footer";
import { Link } from "react-router-dom";

// NOVO: centralização de rotas/endpoints
import { authFetchRoutes, paths } from "@/app/routes";

const Home = () => {
  const navigate = useNavigate();

  useEffect(() => {
    async function renewToken() {
      try {
        const res = await authFetchRoutes.refreshToken();
        if (res.ok) {
          await res.json();
        }
      } catch {
        // opcional: se quiser log/toast, coloca aqui
      }
    }
    renewToken();
  }, []);

  const [activeTab, setActiveTab] = useState("tab1");
  const [searchValue, setSearchValue] = useState("");

  // Dropdown filtros
  const [showFilters, setShowFilters] = useState(false);
  const filterWrapRef = useRef<HTMLDivElement | null>(null);

  const [filters, setFilters] = useState({
    categoria: "",
    marca: "",
    condicao: "",
    precoMin: "",
    precoMax: "",
    localizacao: "",
  });

  // Dados simulados para filtros
  const marcas = [
    { id: "1", name: "Caloi" },
    { id: "2", name: "Monark" },
    { id: "3", name: "Soul" },
    { id: "4", name: "Sense" },
    { id: "5", name: "Scott" },
    { id: "6", name: "Trek" },
  ];

  const categorias = [
    { id: "1", name: "Mountain Bike" },
    { id: "2", name: "Speed" },
    { id: "3", name: "Urbana" },
    { id: "4", name: "Elétrica" },
    { id: "5", name: "Infantil" },
    { id: "6", name: "Dobrável" },
  ];

  const cardSection2Data = [
    { image: "/img/card1.png", link: "/page1" },
    { image: "/img/card2.png", link: "/page2" },
    { image: "/img/card3.png", link: "/page3" },
    { image: "/img/card4.png", link: "/page4" },
    { image: "/img/card5.png", link: "/page5" },
    { image: "/img/card6.png", link: "/page6" },
  ];

  const cardSection4Data = [
    { image: "/img/style.png", link: "/oferta1", title: "MOUNTAIN BIKE" },
    { image: "/img/style.png", link: "/oferta3", title: "TRIATHLON" },
    { image: "/img/style.png", link: "/oferta4", title: "TRIAL" },
    { image: "/img/style.png", link: "/oferta2", title: "BIKES ANTIGAS" },
    { image: "/img/style.png", link: "/oferta5", title: "BIKE ELÉTRICA" },
    { image: "/img/style.png", link: "/oferta6", title: "SPEED" },
  ];

  const activeFiltersCount = useMemo(() => {
    return Object.values(filters).filter((v) => String(v ?? "").trim() !== "")
      .length;
  }, [filters]);

  const handleSearch = () => {
    const params = new URLSearchParams();

    params.set("tipo", activeTab === "tab1" ? "bikes" : "pecas");

    if (searchValue.trim()) params.set("q", searchValue.trim());
    if (filters.categoria) params.set("categoria", filters.categoria);
    if (filters.marca) params.set("marca", filters.marca);
    if (filters.condicao) params.set("condicao", filters.condicao);
    if (filters.precoMin) params.set("min", filters.precoMin);
    if (filters.precoMax) params.set("max", filters.precoMax);
    if (filters.localizacao.trim())
      params.set("localizacao", filters.localizacao.trim());

    navigate(paths.search(params.toString()));
    setShowFilters(false);
  };

  const clearFilters = () => {
    setFilters({
      categoria: "",
      marca: "",
      condicao: "",
      precoMin: "",
      precoMax: "",
      localizacao: "",
    });
  };

  // Fecha dropdown ao clicar fora + ESC
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (!showFilters) return;
      const el = filterWrapRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setShowFilters(false);
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
                    onClick={handleSearch}
                    className="w-[110px] sm:w-[160px] bg-gradient-to-r from-[#09bc8a] to-[#0c1b33] text-white font-bold flex items-center justify-center gap-2 hover:from-[#08ab7d] hover:to-[#0a172e] rounded-tr-lg text-sm sm:text-base"
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
                          if (e.key === "Enter") handleSearch();
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
                                <div>
                                  <label className="block text-xs font-bold text-gray-700 mb-2">
                                    Categoria
                                  </label>
                                  <select
                                    value={filters.categoria}
                                    onChange={(e) =>
                                      setFilters({
                                        ...filters,
                                        categoria: e.target.value,
                                      })
                                    }
                                    className="w-full h-[42px] px-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#09bc8a] focus:border-transparent bg-white"
                                  >
                                    <option value="">Todas</option>
                                    {categorias.map((categoria) => (
                                      <option
                                        key={categoria.id}
                                        value={categoria.id}
                                      >
                                        {categoria.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-xs font-bold text-gray-700 mb-2">
                                    Marca
                                  </label>
                                  <select
                                    value={filters.marca}
                                    onChange={(e) =>
                                      setFilters({
                                        ...filters,
                                        marca: e.target.value,
                                      })
                                    }
                                    className="w-full h-[42px] px-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#09bc8a] focus:border-transparent bg-white"
                                  >
                                    <option value="">Todas</option>
                                    {marcas.map((marca) => (
                                      <option key={marca.id} value={marca.id}>
                                        {marca.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-xs font-bold text-gray-700 mb-2">
                                    Condição
                                  </label>
                                  <select
                                    value={filters.condicao}
                                    onChange={(e) =>
                                      setFilters({
                                        ...filters,
                                        condicao: e.target.value,
                                      })
                                    }
                                    className="w-full h-[42px] px-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#09bc8a] focus:border-transparent bg-white"
                                  >
                                    <option value="">Todas</option>
                                    <option value="nova">Nova</option>
                                    <option value="seminova">Seminova</option>
                                    <option value="usada">Usada</option>
                                  </select>
                                </div>

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
                                    onClick={handleSearch}
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
                  </div>

                  <div className="mt-2 text-[12px] text-gray-500 flex items-center justify-between">
                    <span>
                      Dica: pressione <span className="font-semibold">Enter</span>{" "}
                      para pesquisar
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

export default Home;
