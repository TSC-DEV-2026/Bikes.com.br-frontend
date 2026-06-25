import { Link } from "react-router-dom";
import type { ReactNode } from "react";

import {
  MARKETPLACE_CATEGORY_FILTER_CHIPS,
  MARKETPLACE_SORT_FILTER_CHIPS,
  resolveActiveQuickFilterId,
} from "@/lib/marketplace-quick-filters";
import { cn } from "@/lib/utils";

export type MarketplaceQuickFiltersProps = {
  /** Termo `q` atual (para destacar chip ativo). */
  activeSearchQuery?: string;
  className?: string;
};

function FilterChip({
  chip,
  active,
}: {
  chip: { id: string; label: string; href: string };
  active: boolean;
}) {
  return (
    <Link
      to={chip.href}
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold transition",
        "sm:px-3 sm:py-1.5 sm:text-sm",
        "lg:px-2.5 lg:py-1 lg:text-xs",
        active
          ? "border-[#09bc8a] bg-[#09bc8a]/10 text-[#078f6f]"
          : "border-gray-200 bg-white text-gray-700 hover:border-[#09bc8a]/50 hover:text-[#09bc8a]",
      )}
      aria-current={active ? "page" : undefined}
    >
      {chip.label}
    </Link>
  );
}

function FilterGroup({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col items-center gap-1 sm:gap-1.5",
        "lg:flex-row lg:items-center lg:gap-2",
        className,
      )}
    >
      <span className="shrink-0 text-[0.65rem] font-bold uppercase tracking-wide text-gray-400 lg:text-[0.7rem] lg:normal-case lg:tracking-normal">
        {label}
      </span>
      <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
        {children}
      </div>
    </div>
  );
}

export function MarketplaceQuickFilters({
  activeSearchQuery = "",
  className,
}: MarketplaceQuickFiltersProps) {
  const activeId = resolveActiveQuickFilterId(activeSearchQuery);

  return (
    <div
      className={cn(
        "flex w-full flex-col items-stretch gap-2 sm:gap-2.5",
        "lg:flex-row lg:flex-wrap lg:items-center lg:justify-center lg:gap-x-5 lg:gap-y-2",
        className,
      )}
      role="navigation"
      aria-label="Filtros rápidos"
    >
      <FilterGroup label="Categorias">
        {MARKETPLACE_CATEGORY_FILTER_CHIPS.map((chip) => (
          <FilterChip
            key={chip.id}
            chip={chip}
            active={chip.id === activeId}
          />
        ))}
      </FilterGroup>

      <span
        className="hidden h-5 w-px shrink-0 bg-gray-200 lg:block"
        aria-hidden
      />

      <FilterGroup label="Ordenar por:">
        {MARKETPLACE_SORT_FILTER_CHIPS.map((chip) => (
          <FilterChip
            key={chip.id}
            chip={chip}
            active={chip.id === activeId}
          />
        ))}
      </FilterGroup>
    </div>
  );
}
