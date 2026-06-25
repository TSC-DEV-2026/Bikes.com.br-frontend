import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Bike,
  ImagePlus,
  LayoutGrid,
  ListChecks,
  Loader2,
  Package,
  Sparkles,
  Store,
  Tag,
} from "lucide-react";

import { paths } from "@/api/endpoints";
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
import { venderProdutoSecondaryButtonClass } from "@/pages/vender/vender-produto-editor-utils";
import { cn } from "@/lib/utils";
import { useVenderCreateSellerGate } from "@/pages/vender/use-vender-create-seller-gate";
import { VenderCreateForm } from "@/pages/vender/vender-create-form";

const STEPS = [
  {
    icon: Package,
    title: "Dados principais",
    description: "Título, descrição e visibilidade do anúncio.",
    step: 1,
  },
  {
    icon: Tag,
    title: "Categoria e marca",
    description: "Classifique o produto e escolha a marca.",
    step: 2,
  },
  {
    icon: ImagePlus,
    title: "Fotos e detalhes",
    description: "Imagens, preço, estoque e informações extras.",
    step: 3,
  },
  {
    icon: ListChecks,
    title: "Revisão e publicação",
    description: "Confira tudo antes de publicar na vitrine.",
    step: 4,
  },
] as const;

const BENEFITS = [
  {
    icon: LayoutGrid,
    title: "Cadastro guiado",
    description: "Você preenche uma etapa por vez.",
  },
  {
    icon: Store,
    title: "Organização da vitrine",
    description: "Seu produto fica vinculado à sua loja.",
  },
  {
    icon: Sparkles,
    title: "Anúncio mais completo",
    description: "Inclua preço, fotos, marca e características.",
  },
] as const;

type IntroActionsProps = {
  onStart: () => void;
  className?: string;
  primaryClassName?: string;
  secondaryClassName?: string;
  showSecondary?: boolean;
};

function IntroActions({
  onStart,
  className,
  primaryClassName,
  secondaryClassName,
  showSecondary = true,
}: IntroActionsProps) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:flex-wrap", className)}>
      <Button
        type="button"
        className={cn(
          "w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto sm:min-w-[220px]",
          primaryClassName,
        )}
        onClick={onStart}
      >
        Cadastrar meu produto
        <ArrowRight className="size-4 shrink-0" aria-hidden />
      </Button>
      {showSecondary ? (
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full sm:w-auto",
            secondaryClassName ?? venderProdutoSecondaryButtonClass,
          )}
          asChild
        >
          <Link to={paths.minhaLoja()}>Voltar para Minha loja</Link>
        </Button>
      ) : null}
    </div>
  );
}

function ProductIntroHero({
  onStart,
  pending,
}: {
  onStart: () => void;
  pending: boolean;
}) {
  return (
    <section
      className="grid gap-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-[minmax(0,1fr)_460px] lg:items-center lg:p-10"
      aria-labelledby="intro-hero-title"
    >
      <div className="min-w-0">
        <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
          Painel do vendedor
        </span>
        <h1
          id="intro-hero-title"
          className="mt-5 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl"
        >
          Anuncie sua bike, peça ou acessório
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
          Monte seu anúncio em poucos passos, adicione fotos, escolha categoria e publique na sua
          vitrine.
        </p>

        {pending ? (
          <p
            role="status"
            className="mt-6 max-w-xl rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950"
          >
            Sua conta está em análise. Você pode preencher o formulário, mas o envio só será
            liberado após a aprovação.
          </p>
        ) : null}

        <IntroActions onStart={onStart} className="mt-8" />
      </div>

      <article
        className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm"
        aria-label="Prévia de como seu anúncio pode aparecer"
      >
        <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100">
          Prévia do anúncio
        </span>

        <div className="mt-4 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-slate-200 to-slate-100">
          <Bike className="size-14 text-slate-400/90" strokeWidth={1.25} aria-hidden />
        </div>

        <h2 className="mt-4 text-lg font-bold leading-snug text-slate-900">
          Bicicleta MTB aro 29
        </h2>
        <p className="mt-1 text-2xl font-black tracking-tight text-emerald-700">R$ 1.899,90</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {["Categoria", "Marca", "Fotos"].map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
            >
              {chip}
            </span>
          ))}
        </div>

        <p className="mt-4 text-xs leading-relaxed text-slate-500">
          Você revisa tudo antes de publicar.
        </p>
      </article>
    </section>
  );
}

function ProductIntroSteps() {
  return (
    <section className="mt-8" aria-labelledby="intro-steps-title">
      <h2 id="intro-steps-title" className="text-2xl font-bold tracking-tight text-slate-950">
        Como funciona
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
        Você preenche etapa por etapa e revisa tudo antes de publicar.
      </p>

      <ol className="mt-6 grid gap-4 md:grid-cols-4">
        {STEPS.map(({ icon: Icon, title, description, step }) => (
          <li
            key={step}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Passo {step}
            </span>
            <span className="mt-4 flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
              <Icon className="size-5" aria-hidden />
            </span>
            <h3 className="mt-4 text-base font-semibold leading-snug text-slate-900">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ProductIntroBenefits() {
  return (
    <section className="mt-8" aria-labelledby="intro-benefits-title">
      <h2 id="intro-benefits-title" className="text-2xl font-bold tracking-tight text-slate-950">
        Por que anunciar aqui
      </h2>

      <ul className="mt-6 grid gap-4 md:grid-cols-3">
        {BENEFITS.map(({ icon: Icon, title, description }) => (
          <li key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <span className="flex size-11 items-center justify-center rounded-xl bg-slate-50 text-slate-800 ring-1 ring-slate-100">
              <Icon className="size-5" aria-hidden />
            </span>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProductIntroCta({ onStart }: { onStart: () => void }) {
  return (
    <section
      className="mt-10 rounded-3xl bg-slate-950 p-6 text-white sm:p-8"
      aria-labelledby="intro-cta-title"
    >
      <h2 id="intro-cta-title" className="text-2xl font-bold sm:text-3xl">
        Pronto para começar?
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
        Abra o cadastro guiado e publique seu produto na vitrine da sua loja.
      </p>
      <Button
        type="button"
        className="mt-6 w-full bg-emerald-500 text-white hover:bg-emerald-400 sm:w-auto sm:min-w-[220px]"
        onClick={onStart}
      >
        Cadastrar meu produto
        <ArrowRight className="size-4 shrink-0" aria-hidden />
      </Button>
    </section>
  );
}

export default function VenderProdutoCreateIntroPage() {
  const navigate = useNavigate();
  const gate = useVenderCreateSellerGate();

  const goToForm = () => navigate(paths.venderAnunciar());

  const showContent =
    gate.bootstrapped &&
    !gate.awaitingAuthBootstrap &&
    gate.isAuthenticated &&
    !gate.loading &&
    !gate.loadError &&
    gate.canCreate;

  const showLoading =
    gate.awaitingAuthBootstrap ||
    (gate.bootstrapped && gate.isAuthenticated && gate.loading && !gate.loadError && !gate.needsSellerAccount);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />
      <main className="flex-1 pt-[4.5rem]">
        {showLoading ? (
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div
              role="status"
              aria-busy="true"
              className="flex flex-col items-center gap-4 text-center"
            >
              <Loader2 className="size-10 animate-spin text-[#09bc8a]" aria-hidden />
              <p className="text-sm font-medium text-slate-600">Verificando sua loja…</p>
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
                <CardDescription>Entre na sua conta para cadastrar um produto.</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button type="button" asChild>
                  <Link
                    to={`${paths.login()}?next=${encodeURIComponent(paths.venderCadastroProduto())}`}
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

        {gate.bootstrapped &&
          gate.isAuthenticated &&
          !gate.loading &&
          gate.blocked &&
          gate.vendedor ? (
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
                    <Link to={paths.minhaLoja()}>Ir para Minha loja</Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          ) : null}

        {gate.bootstrapped &&
          gate.isAuthenticated &&
          !gate.loading &&
          gate.showContaIndisponivel ? (
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

        {showContent ? (
          <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <ProductIntroHero onStart={goToForm} pending={gate.pending} />
            <ProductIntroSteps />
            <ProductIntroBenefits />
            <ProductIntroCta onStart={goToForm} />
          </div>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
