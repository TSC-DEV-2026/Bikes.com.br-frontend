import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { FaBolt, FaMagnifyingGlass, FaShieldHalved, FaUsers } from "react-icons/fa6";

type TrustItem = {
  title: string;
  description: string;
  icon: ReactNode;
};

const items: TrustItem[] = [
  {
    title: "Compra direta",
    description: "Converse e feche direto com ciclistas.",
    icon: <FaUsers />,
  },
  {
    title: "Busca inteligente",
    description: "Encontre bikes e peças com rapidez.",
    icon: <FaMagnifyingGlass />,
  },
  {
    title: "Anúncios organizados",
    description: "Tudo em categorias claras e objetivas.",
    icon: <FaBolt />,
  },
  {
    title: "Experiência segura",
    description: "Mais clareza e controle na negociação.",
    icon: <FaShieldHalved />,
  },
];

export function TrustStrip() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="relative bg-white">
      <div className="mx-auto max-w-[1180px] px-5 pb-2 pt-10 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f6fffc_45%,#ffffff_100%)] p-6 shadow-[0_18px_60px_-35px_rgba(12,27,51,0.28)] sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_35%,rgba(9,188,138,0.16)_0%,transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_40%,rgba(12,27,51,0.10)_0%,transparent_58%)]" />

          <div className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((item, idx) => {
              const Card = reducedMotion ? "div" : motion.div;
              return (
                <Card
                  key={item.title}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:border-[#09bc8a]/35 hover:shadow-xl"
                  {...(reducedMotion
                    ? {}
                    : {
                        initial: { opacity: 0, y: 12 },
                        whileInView: { opacity: 1, y: 0 },
                        viewport: { once: true, amount: 0.4 },
                        transition: {
                          duration: 0.5,
                          ease: [0.22, 1, 0.36, 1],
                          delay: idx * 0.06,
                        },
                      })}
                >
                  <div className="absolute -right-12 -top-12 h-24 w-24 rounded-full bg-[#09bc8a]/10 blur-2xl transition group-hover:bg-[#09bc8a]/20" />
                  <div className="relative flex items-start gap-4">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#09bc8a]/10 text-[#09bc8a] ring-1 ring-[#09bc8a]/20 [&_svg]:h-5 [&_svg]:w-5">
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-sm font-black text-[#0c1b33]">{item.title}</p>
                      <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

