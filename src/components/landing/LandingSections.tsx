import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { listLancamentos } from "@/api/endpoints/produtos.routes";
import { paths } from "@/api/endpoints/paths";
import { catalogUrl } from "@/lib/search-query-params";
import {
  itemUnknownToListaView,
  type ProdutoListagemItem,
} from "@/types/produto";
import { ProdutoVitrineCard } from "@/components/produto/produto-vitrine-card";
import { cn } from "@/lib/utils";
import {
  FaBolt,
  FaShieldHalved,
  FaMagnifyingGlass,
  FaComments,
  FaBicycle,
  FaGear,
  FaArrowRight,
  FaLock,
} from "react-icons/fa6";

type SectionTitleProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
};

function SectionTitle({ eyebrow, title, subtitle }: SectionTitleProps) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      {eyebrow ? (
        <p className="text-xs font-black text-[#09bc8a]">
          {eyebrow}
        </p>
      ) : null}

      <h2 className="mt-2 text-2xl font-black tracking-tight text-[#0c1b33] sm:text-3xl">
        {title}
      </h2>

      {subtitle ? (
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

type BenefitCardProps = {
  icon: ReactNode;
  title: string;
  text: string;
};

function BenefitCard({ icon, title, text }: BenefitCardProps) {
  return (
    <div className="group relative flex h-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#09bc8a]/40 hover:shadow-xl">
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#09bc8a]/10 blur-2xl transition group-hover:bg-[#09bc8a]/20" />

      <div className="relative flex flex-1 items-start gap-5">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#09bc8a]/10 text-[#09bc8a] ring-1 ring-[#09bc8a]/20 [&_svg]:h-6 [&_svg]:w-6">
          {icon}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="text-base font-black leading-tight text-[#0c1b33]">
            {title}
          </h3>

          <p className="mt-3 flex-1 text-sm leading-7 text-slate-600">{text}</p>
        </div>
      </div>
    </div>
  );
}

export function BenefitsSection() {
  const reducedMotion = useReducedMotion();
  const Card = reducedMotion ? "div" : motion.div;

  return (
    <section id="como-funciona" className="relative overflow-hidden bg-white">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

      <div className="mx-auto max-w-[1180px] px-5 py-8 sm:px-6 sm:py-10 lg:px-8">
        <SectionTitle
          eyebrow="Por que Bikes.com.br?"
          title="Um marketplace pensado para ciclistas"
        />

        <div className="mt-8 grid auto-rows-fr gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Card
            className="h-full"
            {...(reducedMotion
              ? {}
              : {
                  initial: { opacity: 0, y: 14 },
                  whileInView: { opacity: 1, y: 0 },
                  viewport: { once: true, amount: 0.4 },
                  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
                })}
          >
            <BenefitCard
              icon={<FaShieldHalved />}
              title="Compra mais segura"
              text="Experiência clara e focada em reduzir fricção na negociação. Você controla o contato e decide com quem fechar."
            />
          </Card>

          <Card
            className="h-full"
            {...(reducedMotion
              ? {}
              : {
                  initial: { opacity: 0, y: 14 },
                  whileInView: { opacity: 1, y: 0 },
                  viewport: { once: true, amount: 0.4 },
                  transition: {
                    duration: 0.55,
                    ease: [0.22, 1, 0.36, 1],
                    delay: 0.06,
                  },
                })}
          >
            <BenefitCard
              icon={<FaBolt />}
              title="Anuncie em poucos minutos"
              text="Cadastre sua bike, peça ou acessório rapidamente. Do celular ao desktop, sem perder tempo."
            />
          </Card>

          <Card
            className="h-full"
            {...(reducedMotion
              ? {}
              : {
                  initial: { opacity: 0, y: 14 },
                  whileInView: { opacity: 1, y: 0 },
                  viewport: { once: true, amount: 0.4 },
                  transition: {
                    duration: 0.55,
                    ease: [0.22, 1, 0.36, 1],
                    delay: 0.12,
                  },
                })}
          >
            <BenefitCard
              icon={<FaComments />}
              title="Fale direto com vendedores"
              text="Converse e negocie com transparência. Sem intermediários forçando passos extras."
            />
          </Card>
        </div>
      </div>
    </section>
  );
}

const categories = [
  {
    title: "Bikes",
    desc: "MTB, Speed, Urbana e mais",
    icon: <FaBicycle />,
    href: catalogUrl(paths.produtos(), { q: "bikes" }),
    action: "Ver bikes",
    image: "/img/03_categoria_bikes.png",
  },
  {
    title: "Peças",
    desc: "Transmissão, freios e rodas",
    icon: <FaGear />,
    href: catalogUrl(paths.produtos(), { q: "peças" }),
    action: "Ver peças",
    image: "/img/04_categoria_pecas.png",
  },
  {
    title: "Acessórios",
    desc: "Luzes, suportes e bags",
    icon: <FaLock />,
    href: catalogUrl(paths.produtos(), { q: "acessórios" }),
    action: "Ver acessórios",
    image: "/img/05_categoria_acessorios.png",
  },
] as const;

export function CategoriesSection() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden bg-[#eefbf8]">
      <div className="absolute left-1/2 top-0 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-[#09bc8a]/10 blur-3xl" />

      <div className="relative mx-auto max-w-[1240px] px-5 py-6 sm:px-6 sm:py-8 lg:px-8">
        <SectionTitle
          eyebrow="Explore"
          title="Categorias populares"
          subtitle="Comece por onde faz sentido para você."
        />

        <div className="mt-8 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category, idx) => (
            <Link
              key={category.title}
              to={category.href}
              className="group block overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white p-3 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#09bc8a]/40 hover:shadow-xl"
            >
              <motion.div
                className="relative h-44 overflow-visible rounded-xl lg:h-48"
                initial={reducedMotion ? undefined : { opacity: 0, y: 14 }}
                whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={reducedMotion ? undefined : { once: true, amount: 0.35 }}
                transition={{
                  duration: 0.55,
                  ease: [0.22, 1, 0.36, 1],
                  delay: reducedMotion ? 0 : idx * 0.06,
                }}
              >
                <div className="h-full overflow-hidden rounded-xl">
                  <img
                    src={category.image}
                    alt={category.title}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="absolute inset-0 overflow-hidden rounded-xl bg-gradient-to-t from-slate-950/20 to-transparent" />
                <div className="absolute -bottom-6 left-5 grid h-16 w-16 place-items-center rounded-full bg-white text-[#09bc8a] shadow-xl shadow-slate-900/10 ring-1 ring-slate-100 [&_svg]:h-8 [&_svg]:w-8">
                  {category.icon}
                </div>
              </motion.div>

              <div className="flex items-end justify-between gap-4 px-3 pb-3 pt-8">
                <div>
                  <p className="text-lg font-black text-[#0c1b33] md:text-base lg:text-lg">{category.title}</p>
                  <p className="mt-1 text-sm font-semibold leading-5 text-slate-600 md:text-xs lg:text-sm">{category.desc}</p>
                </div>

                <span className="shrink-0 rounded-lg border border-[#09bc8a]/20 bg-[#09bc8a]/5 px-4 py-2 text-xs font-black text-[#09bc8a]">
                  {category.action}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HowItWorksSection() {
  const steps = [
    {
      number: "01",
      title: "Busque",
      text: "Pesquise por bikes, peças e acessórios usando termos simples e categorias bem definidas.",
      icon: <FaMagnifyingGlass />,
    },
    {
      number: "02",
      title: "Negocie",
      text: "Converse diretamente com o vendedor e alinhe preço, estado do produto e entrega.",
      icon: <FaComments />,
    },
    {
      number: "03",
      title: "Feche com segurança",
      text: "Finalize a negociação com mais clareza e controle sobre cada etapa da compra.",
      icon: <FaShieldHalved />,
    },
  ] as const;

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionTitle
          eyebrow="Como funciona"
          title="Do interesse ao fechamento em 3 passos"
          subtitle="O fluxo foi pensado para reduzir atrito e deixar a jornada mais objetiva para compradores e vendedores."
        />

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.title}
              className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#0c1b33]/20 hover:shadow-xl"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#0c1b33] text-lg text-white shadow-lg shadow-[#0c1b33]/15">
                  {step.icon}
                </div>

                <span className="text-4xl font-black tracking-tight text-slate-100 transition group-hover:text-[#09bc8a]/20">
                  {step.number}
                </span>
              </div>

              <h3 className="mt-6 text-xl font-black text-[#0c1b33]">
                {step.title}
              </h3>

              <p className="mt-3 text-sm leading-7 text-slate-600">
                {step.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export type FeaturedSectionProps = {
  /** Quantidade máxima de cards exibidos. */
  maxItems?: number;
  className?: string;
};

function featuredGridClass(itemCount: number): string {
  const base = "grid gap-2.5 sm:gap-3 lg:gap-3.5";
  if (itemCount <= 1) {
    return `mx-auto max-w-[280px] grid-cols-1 ${base}`;
  }
  if (itemCount === 2) {
    return `mx-auto max-w-lg grid-cols-2 ${base} lg:max-w-none`;
  }
  if (itemCount === 3) {
    return `mx-auto max-w-3xl grid-cols-2 sm:grid-cols-3 ${base} lg:max-w-none`;
  }
  return `grid-cols-2 lg:grid-cols-4 ${base}`;
}

export function FeaturedSection({
  maxItems = 4,
  className,
}: FeaturedSectionProps) {
  const reducedMotion = useReducedMotion();
  const [items, setItems] = useState<ProdutoListagemItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setErrorMsg(null);
    void (async () => {
      try {
        const res = await listLancamentos();
        if (cancelled) return;
        const raw = Array.isArray(res.data) ? res.data : [];
        setItems(raw.slice(0, maxItems));
        setStatus("ready");
      } catch (e) {
        if (cancelled) return;
        setItems([]);
        if (axios.isAxiosError(e) && !e.response && e.code === "ERR_NETWORK") {
          setErrorMsg("Sem conexão. Verifique sua rede.");
        } else {
          setErrorMsg("Não foi possível carregar os destaques.");
        }
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [maxItems]);

  if (status === "ready" && items.length === 0) {
    return null;
  }

  return (
    <section className={cn("relative overflow-hidden bg-white", className)}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

      <div className="mx-auto max-w-[1280px] px-4 py-3 sm:px-5 sm:py-4">
        <SectionTitle
          eyebrow="Destaques"
          title="Explore o que está em alta"
          subtitle="Anúncios reais disponíveis no marketplace — abra o detalhe sem precisar entrar."
        />

        {status === "loading" && (
          <div
            className={cn(
              "mt-3 sm:mt-4",
              featuredGridClass(Math.min(maxItems, 4)),
            )}
            aria-busy="true"
          >
            {Array.from({ length: Math.min(maxItems, 4) }).map((_, i) => (
              <div
                key={i}
                className="min-h-[200px] animate-pulse rounded-xl border border-slate-100 bg-slate-100 sm:min-h-[240px]"
                aria-hidden
              />
            ))}
          </div>
        )}

        {status === "error" && errorMsg && (
          <p className="mt-3 text-center text-sm text-slate-500" role="alert">
            {errorMsg}
          </p>
        )}

        {status === "ready" && items.length > 0 && (
          <div className={cn("mt-3 sm:mt-4", featuredGridClass(items.length))}>
            {items.map((raw, idx) => {
              const p = itemUnknownToListaView(raw);
              if (!p) return null;
              const href = `/produtos/${encodeURIComponent(String(p.id))}`;
              const Card = reducedMotion ? "div" : motion.div;
              return (
                <Card
                  key={String(p.id)}
                  className="min-w-0"
                  {...(reducedMotion
                    ? {}
                    : {
                        initial: { opacity: 0, y: 10 },
                        whileInView: { opacity: 1, y: 0 },
                        viewport: { once: true, amount: 0.2 },
                        transition: {
                          duration: 0.4,
                          ease: [0.22, 1, 0.36, 1],
                          delay: idx * 0.04,
                        },
                      })}
                >
                  <ProdutoVitrineCard
                    produto={p}
                    href={href}
                    favoriteIds={new Set()}
                    pendingFavoriteIds={new Set()}
                    onToggleFavorite={() => {}}
                    loginHref={`/login?next=${encodeURIComponent(href)}`}
                  />
                </Card>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex justify-center sm:mt-5">
          <Button
            variant="outline"
            className="h-11 rounded-xl border-[#09bc8a]/30 px-6 font-bold text-[#09bc8a] hover:bg-[#09bc8a]/5"
            asChild
          >
            <Link to={paths.produtos()}>
              Ver todos os anúncios
              <FaArrowRight className="ml-2 size-3.5" aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

export function FinalCtaSection() {
  return (
    <section className="relative overflow-hidden bg-[#0c1b33]">
      <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#09bc8a]/20 blur-3xl" />
      <div className="absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-[#09bc8a]/10 blur-3xl" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:72px_72px] opacity-[0.18]" />

      <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06] p-8 text-center shadow-2xl shadow-black/20 backdrop-blur sm:p-12">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#09bc8a] text-2xl text-white shadow-lg shadow-[#09bc8a]/20">
            <FaBicycle />
          </div>

          <h3 className="mx-auto mt-6 max-w-3xl text-3xl font-black tracking-tight text-white sm:text-4xl">
            Pronto para vender sua bike ou encontrar a próxima?
          </h3>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/70">
            Crie sua conta, explore anúncios e prepare sua vitrine para bikes,
            peças e acessórios.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              className="group relative h-11 overflow-hidden rounded-xl bg-[#09bc8a] px-6 font-black text-white shadow-lg shadow-[#09bc8a]/25 transition hover:-translate-y-0.5 hover:bg-[#08a97c] hover:shadow-xl active:translate-y-0"
              asChild
            >
              <Link to="/register">
                <span className="relative z-10">Criar conta</span>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -left-1/3 top-0 h-full w-1/3 rotate-12 bg-white/25 blur-md transition duration-700 group-hover:translate-x-[260%]"
                />
              </Link>
            </Button>

            <Button
              variant="outline"
              className="h-11 rounded-xl border-white/20 bg-white/5 px-6 font-black text-white hover:bg-white/10 hover:text-white"
              asChild
            >
              <Link to="/login">Já tenho conta</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl justify-items-center gap-8 px-4 py-10 text-center sm:px-6 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr] lg:px-8">
        <div className="flex flex-col items-center">
          <p className="flex items-center justify-center gap-2 text-xl font-black text-[#0c1b33]">
            <FaBicycle className="text-[#09bc8a]" />
            Bikes<span className="-ml-2 text-[#09bc8a]">.com.br</span>
          </p>
          <p className="mt-1 text-sm text-slate-600">
            O marketplace feito por ciclistas, para ciclistas.
          </p>
          <div className="mt-5 flex justify-center gap-3 text-sm font-black text-slate-400">
            <span>IG</span>
            <span>FB</span>
            <span>YT</span>
          </div>
        </div>

        <nav className="flex flex-col items-center gap-2 text-sm font-bold text-slate-600">
          <p className="mb-1 text-sm font-black text-[#0c1b33]">Marketplace</p>
          <Link className="transition hover:text-[#09bc8a]" to={paths.produtos()}>
            Buscar bikes
          </Link>

          <Link className="transition hover:text-[#09bc8a]" to={catalogUrl(paths.produtos(), { q: "peças" })}>
            Peças
          </Link>

          <Link className="transition hover:text-[#09bc8a]" to={catalogUrl(paths.produtos(), { q: "acessórios" })}>
            Acessórios
          </Link>

          <Link className="transition hover:text-[#09bc8a]" to="/#como-funciona">
            Como funciona
          </Link>
        </nav>

        <nav className="flex flex-col items-center gap-2 text-sm font-bold text-slate-600">
          <p className="mb-1 text-sm font-black text-[#0c1b33]">Vender</p>
          <Link className="transition hover:text-[#09bc8a]" to="/login?next=%2Fvender">
            Anunciar minha bike
          </Link>

          <Link className="transition hover:text-[#09bc8a]" to="/login?next=%2Fvender">
            Dicas para vender
          </Link>

          <Link className="transition hover:text-[#09bc8a]" to="/login?next=%2Fvender">
            Central de ajuda
          </Link>
        </nav>

        <nav className="flex flex-col items-center gap-2 text-sm font-bold text-slate-600">
          <p className="mb-1 text-sm font-black text-[#0c1b33]">Institucional</p>
          <Link className="transition hover:text-[#09bc8a]" to="/about">
            Sobre
          </Link>

          <Link className="transition hover:text-[#09bc8a]" to="/login" aria-label="Termos">
            Termos
          </Link>

          <Link className="transition hover:text-[#09bc8a]" to="/login" aria-label="Privacidade">
            Privacidade
          </Link>

          <Link className="transition hover:text-[#09bc8a]" to="/login" aria-label="Contato">
            Contato
          </Link>
        </nav>
      </div>

      <div className="border-t border-slate-100 py-5 text-center text-xs font-semibold text-slate-400">
        © 2024 Bikes.com.br. Todos os direitos reservados.
      </div>
    </footer>
  );
}