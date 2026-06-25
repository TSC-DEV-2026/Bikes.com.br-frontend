import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { paths } from "@/api/endpoints/paths";
import { MARKETPLACE_SELL_CTA_HREF } from "@/lib/marketplace-quick-filters";
import { cn } from "@/lib/utils";

const SLIDES = [
  {
    id: "destaques",
    title: "Bikes, peças e acessórios em destaque",
    subtitle: "Explore anúncios reais sem precisar criar conta.",
    href: paths.produtos(),
    cta: "Ver anúncios",
  },
  {
    id: "vender",
    title: "Anuncie sua bike em poucos minutos",
    subtitle: "Publique seu anúncio e alcance compradores em todo o Brasil.",
    href: MARKETPLACE_SELL_CTA_HREF,
    cta: "Começar a vender",
  },
  {
    id: "ofertas",
    title: "Ofertas recentes para ciclistas",
    subtitle: "Confira os lançamentos e últimos anúncios do marketplace.",
    href: `${paths.produtos()}?ordenacao=recentes`,
    cta: "Ver ofertas",
  },
] as const;

const ROTATE_MS = 6000;

export function MarketplacePromoBanner({ className }: { className?: string }) {
  const reducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index]!;

  useEffect(() => {
    if (reducedMotion) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [reducedMotion]);

  const go = (delta: number) => {
    setIndex((i) => (i + delta + SLIDES.length) % SLIDES.length);
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-slate-200/80 bg-gradient-to-r from-[#0c1b33] via-[#123a5c] to-[#0c1b33] text-white shadow-sm",
        className,
      )}
      aria-roledescription="carrossel"
      aria-label="Destaques do marketplace"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(9,188,138,0.18),transparent_55%)]" />
      <div className="relative flex min-h-[88px] items-center gap-3 px-4 py-3 sm:min-h-[96px] sm:px-5 sm:py-4">
        <button
          type="button"
          onClick={() => go(-1)}
          className="hidden size-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20 sm:inline-flex"
          aria-label="Slide anterior"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="text-sm font-black leading-snug sm:text-base">{slide.title}</p>
          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-white/75 sm:text-sm">
            {slide.subtitle}
          </p>
          <Link
            to={slide.href}
            className="mt-2 inline-flex items-center rounded-lg bg-white/95 px-3 py-1.5 text-xs font-bold text-[#0c1b33] transition hover:bg-white sm:text-sm"
          >
            {slide.cta}
          </Link>
        </div>

        <button
          type="button"
          onClick={() => go(1)}
          className="hidden size-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20 sm:inline-flex"
          aria-label="Próximo slide"
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>

      <div className="relative flex justify-center gap-1.5 pb-2.5" aria-hidden>
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setIndex(i)}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i === index ? "w-5 bg-[#09bc8a]" : "w-1.5 bg-white/40",
            )}
            aria-label={`Ir para slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
