import { Link } from "react-router-dom";
import { FaBicycle, FaGear, FaLock } from "react-icons/fa6";

import { paths } from "@/api/endpoints/paths";
import { catalogUrl } from "@/lib/search-query-params";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  {
    id: "bikes",
    label: "Bikes",
    desc: "MTB, road e urbanas",
    icon: FaBicycle,
    href: catalogUrl(paths.produtos(), { q: "bikes" }),
  },
  {
    id: "pecas",
    label: "Peças",
    desc: "Transmissão e freios",
    icon: FaGear,
    href: catalogUrl(paths.produtos(), { q: "peças" }),
  },
  {
    id: "acessorios",
    label: "Acessórios",
    desc: "Luzes, bags e mais",
    icon: FaLock,
    href: catalogUrl(paths.produtos(), { q: "acessórios" }),
  },
] as const;

export function MarketplaceCategoryNav({ className }: { className?: string }) {
  return (
    <nav className={cn("w-full", className)} aria-label="Categorias do marketplace">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {CATEGORIES.map(({ id, label, desc, icon: Icon, href }) => (
          <Link
            key={id}
            to={href}
            className="group flex flex-col items-center rounded-xl border border-slate-200 bg-white px-2 py-3 text-center shadow-sm transition hover:border-[#09bc8a]/45 hover:shadow-md sm:px-3 sm:py-4"
          >
            <span className="grid size-11 place-items-center rounded-full bg-[#eefbf8] text-[#09bc8a] ring-1 ring-[#09bc8a]/15 transition group-hover:bg-[#09bc8a]/10 sm:size-12">
              <Icon className="size-5 sm:size-6" aria-hidden />
            </span>
            <span className="mt-2 text-xs font-black text-[#0c1b33] sm:text-sm">
              {label}
            </span>
            <span className="mt-0.5 hidden text-[10px] leading-snug text-slate-500 sm:block sm:text-xs">
              {desc}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
