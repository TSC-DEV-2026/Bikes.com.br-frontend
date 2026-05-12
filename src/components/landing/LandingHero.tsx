import type { ReactNode } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FaArrowRight,
  FaBicycle,
  FaMagnifyingGlass,
  FaShieldHalved,
  FaUser,
} from "react-icons/fa6";
import { useAuth } from "@/contexts/auth-context";

type HeroBadgeProps = {
  icon: ReactNode;
  title: string;
  text: string;
};

function HeroBadge({ icon, title, text }: HeroBadgeProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className="absolute right-[10%] top-24 hidden h-32 w-32 rounded-full bg-[#e8fff8]/90 px-5 py-6 text-center shadow-xl shadow-slate-900/10 ring-1 ring-white/80 backdrop-blur md:block lg:h-36 lg:w-36"
      initial={reducedMotion ? undefined : { opacity: 0, y: 10, scale: 0.98 }}
      animate={
        reducedMotion ? undefined : { opacity: 1, y: [0, -6, 0], scale: 1 }
      }
      transition={{
        opacity: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
        y: { duration: 6, repeat: Infinity, ease: "easeInOut" },
        scale: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
      }}
    >
      <div className="mx-auto grid h-8 w-8 place-items-center text-lg text-[#09bc8a] lg:h-9 lg:w-9 lg:text-xl">
        {icon}
      </div>
      <p className="mt-2 text-xs font-black leading-tight text-[#0c1b33] lg:text-sm">
        {title}
      </p>
      <p className="text-[0.68rem] font-black text-[#0c1b33] lg:text-xs">
        {text}
      </p>
    </motion.div>
  );
}

export function LandingHero() {
  const navigate = useNavigate();
  const { isAuthenticated, bootstrapped } = useAuth();
  const [query, setQuery] = useState("");
  const homeHref = "/";
  const reducedMotion = useReducedMotion();

  const goSearch = (_q?: string) => {
    if (bootstrapped && isAuthenticated) {
      navigate("/home");
      return;
    }
    navigate("/login");
  };

  return (
    <section className="relative overflow-hidden bg-[#eefbf8]">
      <div className="relative w-full">
        <header className="absolute left-3 right-3 top-3 z-30 flex h-14 items-center justify-between rounded-2xl bg-white/95 px-5 shadow-lg shadow-slate-900/5 ring-1 ring-slate-200/70 backdrop-blur sm:left-4 sm:right-4 sm:h-16 sm:px-7">
          <Link
            to={homeHref}
            className="flex items-center gap-2"
            aria-label="Bikes.com.br"
          >
            <img
              src="/img/logo.png"
              alt="Bikes.com.br"
              className="h-8 w-auto sm:h-10"
            />
          </Link>

          <nav className="flex items-center gap-2 text-xs font-bold text-slate-700 lg:text-sm">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 transition hover:bg-slate-50 hover:text-[#09bc8a]"
            >
              <FaUser className="text-xs" />
              <span>Entrar</span>
            </Link>
          </nav>
        </header>

        <div className="relative min-h-[560px] overflow-hidden pt-20 sm:min-h-[540px] sm:pt-24 lg:min-h-[500px]">
          {reducedMotion ? (
            <img
              src="/img/01_hero_bikes_scene.png"
              alt="Duas bikes em uma trilha de montanha"
              className="absolute inset-0 h-full w-full object-cover object-[65%_50%] sm:object-[58%_54%]"
            />
          ) : (
            <motion.img
              src="/img/01_hero_bikes_scene.png"
              alt="Duas bikes em uma trilha de montanha"
              className="absolute inset-0 h-full w-full object-cover object-[65%_50%] sm:object-[58%_54%]"
              initial={{ scale: 1.05, filter: "saturate(1.02) contrast(1.02)" }}
              animate={{ y: [0, -6, 0], scale: [1.05, 1.04, 1.05] }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
          {/* No mobile, gradiente mais vertical pra não “lavar” a imagem/texto */}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(243,255,252,0.98)_0%,rgba(238,251,248,0.70)_42%,rgba(238,251,248,0.18)_66%,rgba(238,251,248,0)_86%)] sm:hidden" />
          <div className="absolute inset-0 hidden bg-[linear-gradient(90deg,#f3fffc_0%,rgba(243,255,252,0.98)_27%,rgba(238,251,248,0.68)_42%,rgba(238,251,248,0.16)_56%,rgba(238,251,248,0)_72%)] sm:block" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_32%_52%,rgba(255,255,255,0.5)_0%,rgba(255,255,255,0.28)_18%,rgba(255,255,255,0)_38%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(255,255,255,0.55)_0%,rgba(238,251,248,0.35)_32%,rgba(238,251,248,0)_70%)] sm:hidden" />
          <div className="absolute inset-y-0 left-0 hidden w-[55%] bg-[radial-gradient(ellipse_at_36%_55%,rgba(255,255,255,0.72)_0%,rgba(238,251,248,0.48)_36%,rgba(238,251,248,0)_72%)] sm:block lg:w-[48%]" />

          <div className="relative z-10 max-w-2xl px-5 py-12 max-sm:mx-auto max-sm:flex max-sm:flex-col max-sm:items-center max-sm:text-center sm:px-10 md:py-16 lg:px-16 lg:py-16 xl:px-20 2xl:px-24">
            {/* Em telas menores, dá contraste sem alterar o layout */}
            <div className="inline-block max-w-xl rounded-2xl bg-emerald-950/45 px-3 py-2 backdrop-blur-[2px] max-sm:flex max-sm:flex-col max-sm:items-center sm:bg-transparent sm:p-0 sm:backdrop-blur-0 lg:max-w-lg xl:max-w-lg">
              <motion.p
                className="text-xs font-black text-[#09bc8a] max-sm:text-emerald-200 sm:text-sm"
                initial={reducedMotion ? false : { opacity: 0, y: 10 }}
                animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                O marketplace para ciclistas
              </motion.p>

              <motion.h1
                className="mt-4 max-w-xl text-[2.35rem] font-black leading-[1.06] tracking-tight text-[#0c1b33] drop-shadow-[0_1px_0_rgba(255,255,255,0.55)] max-sm:text-slate-50 max-sm:drop-shadow-none sm:text-5xl sm:drop-shadow-none lg:max-w-lg lg:text-[3.5rem] xl:max-w-lg xl:text-[4rem] max-md:max-w-[400px] max-lg:max-w-[500px]"
                initial={
                  reducedMotion
                    ? false
                    : { opacity: 0, y: 16, filter: "blur(6px)" }
                }
                animate={
                  reducedMotion
                    ? undefined
                    : { opacity: 1, y: 0, filter: "blur(0px)" }
                }
                transition={{
                  duration: 0.7,
                  ease: [0.22, 1, 0.36, 1],
                  delay: 0.05,
                }}
              >
                Compre e venda sua bike com facilidade.
              </motion.h1>

              <motion.p
                className="mt-4 text-base font-medium leading-7 text-slate-700 max-sm:text-slate-100/90 sm:text-slate-600 lg:max-w-lg xl:max-w-lg max-lg:max-w-[300px]"
                initial={reducedMotion ? false : { opacity: 0, y: 14 }}
                animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{
                  duration: 0.6,
                  ease: [0.22, 1, 0.36, 1],
                  delay: 0.14,
                }}
              >
                Encontre bicicletas, peças e acessórios com segurança. Anuncie,
                negocie e pedale para novas histórias.
              </motion.p>
            </div>

            <motion.div
              className="mt-4 max-lg:max-w-md rounded-2xl bg-white p-2 shadow-xl shadow-slate-900/10 ring-1 ring-slate-200 max-sm:w-full max-sm:max-w-[320px] max-md:max-w-[400px]"
              initial={reducedMotion ? false : { opacity: 0, y: 14 }}
              animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{
                duration: 0.6,
                ease: [0.22, 1, 0.36, 1],
                delay: 0.22,
              }}
            >
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <FaMagnifyingGlass className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") goSearch();
                    }}
                    placeholder="Buscar bikes, peças ou acessórios..."
                    className="h-12 border-0 bg-transparent pl-11 text-[#0c1b33] shadow-none placeholder:text-slate-400 focus-visible:ring-0"
                  />
                </div>

                <Button
                  className="h-12 rounded-xl bg-[#09bc8a] px-8 font-black text-white shadow-lg shadow-[#09bc8a]/20 hover:bg-[#08a97c] max-sm:w-full"
                  onClick={() => goSearch()}
                  type="button"
                >
                  Buscar
                </Button>
              </div>
            </motion.div>

            <motion.div
              className="mt-6 flex flex-col gap-3 max-sm:w-full max-sm:items-center sm:flex-row sm:items-center"
              initial={reducedMotion ? false : { opacity: 0, y: 12 }}
              animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{
                duration: 0.6,
                ease: [0.22, 1, 0.36, 1],
                delay: 0.3,
              }}
            >
              <Button
                className="h-12 w-full max-w-[320px] rounded-xl bg-[#09bc8a] px-6 font-black text-white hover:bg-[#08a97c] sm:w-auto sm:max-w-none"
                asChild
              >
                <Link to="/login">
                  <FaBicycle className="mr-2" />
                  Vender minha bike
                </Link>
              </Button>
            </motion.div>

            {/* “Negociações mais seguras” só em telas maiores (já existe o badge desktop) */}
          </div>

          <HeroBadge
            icon={<FaShieldHalved />}
            title="Negociações"
            text="mais seguras"
          />
        </div>
      </div>
    </section>
  );
}
