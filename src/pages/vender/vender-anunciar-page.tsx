import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Bike, Cog, Loader2, Package, Shirt } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { categoriasRoutes, paths } from "@/api/endpoints";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAxiosErrorMessage } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import {
  CATEGORY_CARD_COPY,
  findCategoriaPaiByMainSlug,
  isMainCategorySlug,
  MAIN_CATEGORY_SLUGS,
  type MainCategorySlug,
} from "@/pages/vender/category-product-requirements";
import { VenderCreateForm } from "@/pages/vender/vender-create-form";
import { useVenderCreateSellerGate } from "@/pages/vender/use-vender-create-seller-gate";
import type { CategoriaPai } from "@/types/categoria";

const SLUG_ICONS: Record<MainCategorySlug, LucideIcon> = {
  bicicletas: Bike,
  acessorios: Package,
  vestuario: Shirt,
  pecas: Cog,
};

const CATEGORY_FIELD_CHIPS: { slug: MainCategorySlug; label: string; fields: string }[] = [
  { slug: "bicicletas", label: "Bicicletas", fields: "aro, freio, quadro" },
  { slug: "acessorios", label: "Acessórios", fields: "compatibilidade, material" },
  { slug: "vestuario", label: "Vestuário", fields: "tamanho, material" },
  { slug: "pecas", label: "Peças", fields: "modelo, compatibilidade" },
];

type CategoryChoice = {
  slug: MainCategorySlug;
  categoria: CategoriaPai;
  title: string;
  description: string;
};

export default function VenderAnunciarPage() {
  const navigate = useNavigate();
  const gate = useVenderCreateSellerGate();
  const [categorias, setCategorias] = useState<CategoriaPai[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const loadCategorias = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const list = await categoriasRoutes.getCategoriasPai();
      setCategorias(list);
    } catch (e) {
      setCatalogError(getAxiosErrorMessage(e, "Não foi possível carregar as categorias."));
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!gate.bootstrapped || !gate.isAuthenticated || !gate.canCreate) return;
    void loadCategorias();
  }, [gate.bootstrapped, gate.isAuthenticated, gate.canCreate, loadCategorias]);

  const choices = useMemo(() => {
    const out: CategoryChoice[] = [];
    for (const slug of MAIN_CATEGORY_SLUGS) {
      const categoria = findCategoriaPaiByMainSlug(categorias, slug);
      if (!categoria) continue;
      const copy = CATEGORY_CARD_COPY[slug];
      out.push({
        slug,
        categoria,
        title: copy.title,
        description: copy.description,
      });
    }
    return out;
  }, [categorias]);

  const missingSlugs = useMemo(() => {
    const found = new Set(choices.map((c) => c.slug));
    return MAIN_CATEGORY_SLUGS.filter((slug) => !found.has(slug));
  }, [choices]);

  const handleSelect = (choice: CategoryChoice) => {
    navigate(
      paths.venderCadastroProdutoFormulario({
        categoriaId: choice.categoria.id,
        categoriaSlug: choice.slug,
      }),
    );
  };

  const showSellerCheckLoading =
    gate.awaitingAuthBootstrap ||
    (gate.isAuthenticated && gate.loading && !gate.loadError && !gate.needsSellerAccount);

  const showCatalogLoading = gate.canCreate && catalogLoading;

  const showLoading = showSellerCheckLoading || showCatalogLoading;

  const showMainContent =
    gate.bootstrapped &&
    gate.isAuthenticated &&
    gate.canCreate &&
    !gate.loading &&
    !catalogLoading;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />
      <main className="flex-1 pt-[4.5rem]">
        {showLoading ? (
          <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
            <div
              role="status"
              aria-busy="true"
              className="flex flex-col items-center gap-4 text-center"
            >
              <Loader2 className="size-10 animate-spin text-[#09bc8a]" aria-hidden />
              <p className="text-sm font-medium text-slate-600">
                {showCatalogLoading
                  ? "Carregando categorias…"
                  : "Verificando sua conta de vendedor…"}
              </p>
            </div>
          </div>
        ) : null}

        {gate.needsSellerAccount ? (
          <VenderCreateForm onCreated={gate.handleSellerCreated} />
        ) : null}

        {gate.needLogin ? (
          <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
            <Card>
              <CardHeader>
                <CardTitle>Login necessário</CardTitle>
                <CardDescription>Entre na sua conta para anunciar um produto.</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button type="button" asChild>
                  <Link
                    to={`${paths.login()}?next=${encodeURIComponent(paths.venderAnunciar())}`}
                  >
                    Entrar
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        ) : null}

        {gate.bootstrapped && gate.isAuthenticated && gate.loadError ? (
          <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
            <Card className="border-destructive/30 bg-destructive/5">
              <CardHeader>
                <CardTitle>Não foi possível carregar</CardTitle>
                <CardDescription>{gate.loadError}</CardDescription>
              </CardHeader>
              <CardFooter className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={() => void gate.load()}>
                  Tentar novamente
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link to={paths.minhaLoja()}>Minha loja</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        ) : null}

        {gate.blocked && gate.vendedor ? (
          <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
            <Card className="border-red-200 bg-red-50/80">
              <CardHeader>
                <CardTitle className="text-red-950">Conta bloqueada</CardTitle>
                <CardDescription className="text-red-900">
                  Conta bloqueada. Entre em contato com o suporte.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button type="button" variant="outline" asChild>
                  <Link to={paths.minhaLoja()}>Minha loja</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        ) : null}

        {gate.showContaIndisponivel ? (
          <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
            <Card>
              <CardHeader>
                <CardTitle>Cadastro indisponível</CardTitle>
                <CardDescription>
                  No momento, a situação da sua conta não permite cadastrar produtos.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button type="button" variant="secondary" asChild>
                  <Link to={paths.minhaLoja()}>Minha loja</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        ) : null}

        {showMainContent ? (
          <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <aside className="flex flex-col rounded-3xl border border-emerald-500 bg-gradient-to-br from-emerald-100 to-white p-6 sm:p-8">
                <span className="inline-flex w-fit items-center rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-800">
                  Comece seu anúncio
                </span>
                <h1 className="mt-5 text-2xl font-bold tracking-tight text-[#0f2744] sm:text-3xl">
                  Que tipo de produto você vai vender?
                </h1>
                <p className="mt-3 text-base leading-relaxed text-slate-600">
                  A escolha da categoria prepara os campos certos para o seu anúncio.
                </p>
                <p className="mt-4 text-sm leading-relaxed text-slate-500">
                  Depois disso, você preenche dados, preço, fotos e revisa antes de publicar.
                </p>
              </aside>

              <div className="flex min-w-0 flex-col gap-4">
                <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                  <h2 className="text-lg font-semibold text-[#0f2744]">Escolha uma categoria</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Selecione abaixo para abrir o cadastro com os campos adequados.
                  </p>

                  {missingSlugs.length > 0 ? (
                    <p
                      className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
                      role="status"
                    >
                      Algumas categorias não estão disponíveis no momento (
                      {missingSlugs
                        .map((s) => (isMainCategorySlug(s) ? CATEGORY_CARD_COPY[s].title : s))
                        .join(", ")}
                      ). Se precisar delas, tente novamente mais tarde.
                    </p>
                  ) : null}

                  {catalogError ? (
                    <Card className="mt-4 border-destructive/30 bg-destructive/5">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">
                          Não foi possível carregar categorias
                        </CardTitle>
                        <CardDescription>{catalogError}</CardDescription>
                      </CardHeader>
                      <CardFooter className="pt-0">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => void loadCategorias()}
                        >
                          Tentar novamente
                        </Button>
                      </CardFooter>
                    </Card>
                  ) : null}

                  {!catalogError && choices.length === 0 ? (
                    <Card className="mt-4">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Nenhuma categoria disponível</CardTitle>
                        <CardDescription>
                          Não encontramos as categorias principais para anunciar. Tente novamente
                          em instantes.
                        </CardDescription>
                      </CardHeader>
                      <CardFooter className="pt-0">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => void loadCategorias()}
                        >
                          Tentar novamente
                        </Button>
                      </CardFooter>
                    </Card>
                  ) : null}

                  {choices.length > 0 ? (
                    <ul className="mt-5 space-y-3" role="list">
                      {choices.map((choice) => {
                        const Icon = SLUG_ICONS[choice.slug];
                        return (
                          <li key={choice.slug}>
                            <button
                              type="button"
                              onClick={() => handleSelect(choice)}
                              className={cn(
                                "group flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left transition",
                                "hover:border-emerald-300 hover:bg-emerald-50/50",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#09bc8a] focus-visible:ring-offset-2",
                              )}
                            >
                              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#09bc8a]/10 text-[#09bc8a] transition group-hover:bg-[#09bc8a]/15 sm:size-12">
                                <Icon className="size-5 sm:size-6" aria-hidden />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-base font-semibold text-[#0f2744]">
                                  {choice.title}
                                </span>
                                <span className="mt-0.5 block text-sm leading-relaxed text-slate-600">
                                  {choice.description}
                                </span>
                              </span>
                              <span className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-emerald-700 transition group-hover:text-emerald-800 sm:inline-flex">
                                Começar
                                <ArrowRight
                                  className="size-4 transition group-hover:translate-x-0.5"
                                  aria-hidden
                                />
                              </span>
                              <ArrowRight
                                className="size-5 shrink-0 text-emerald-600 sm:hidden"
                                aria-hidden
                              />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </section>

              </div>
            </div>
          </div>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
