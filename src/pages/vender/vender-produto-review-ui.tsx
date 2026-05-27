import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export function ReviewIntroBanner({
  title,
  description,
}: {
  title: string;
  description: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50/70 via-white to-slate-50/30 p-4 sm:p-5">
      <p className="text-sm font-bold text-[#0c1b33]">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">{description}</p>
    </div>
  );
}

export function ReviewBadge({
  variant,
  children,
}: {
  variant: "success" | "warning" | "neutral" | "info";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        variant === "success" && "border-emerald-200 bg-emerald-100 text-emerald-800",
        variant === "warning" && "border-amber-200 bg-amber-100 text-amber-900",
        variant === "neutral" && "border-slate-200 bg-slate-100 text-slate-700",
        variant === "info" && "border-slate-200 bg-white text-slate-800",
      )}
    >
      {children}
    </span>
  );
}

export function ReviewFieldGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

export function ReviewDetail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-1.5 rounded-xl border border-slate-100/90 bg-slate-50/40 px-3.5 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <div className="text-sm font-medium leading-relaxed break-words text-[#0c1b33]">
        {children}
      </div>
    </div>
  );
}

export function ReviewDescriptionBlock({ text }: { text: string }) {
  const hasText = Boolean(text.trim());
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.02]">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        Descrição
      </p>
      <div className="mt-2 max-h-52 overflow-y-auto rounded-lg bg-slate-50/80 px-3 py-2.5">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
          {hasText ? text : "Sem descrição"}
        </p>
      </div>
    </div>
  );
}

export function ReviewPriceBlock({
  precoLabel,
  promoLabel,
}: {
  precoLabel: string;
  promoLabel: string | null;
}) {
  const precoEmpty = !precoLabel || precoLabel === "—" || precoLabel === "Não informado";
  const promoEmpty = !promoLabel || promoLabel === "—" || promoLabel === "Não informado";

  return (
    <div className="rounded-xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/60 via-white to-slate-50/50 p-4 shadow-sm ring-1 ring-emerald-100/50 sm:col-span-2">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Valores</p>
      <p
        className={cn(
          "mt-2 text-2xl font-bold tracking-tight text-[#0c1b33]",
          precoEmpty && "text-base font-medium text-slate-500",
        )}
      >
        {precoEmpty ? "Não informado" : precoLabel}
      </p>
      {!promoEmpty ? (
        <p className="mt-2 text-sm text-slate-600">
          Preço promocional:{" "}
          <span className="font-semibold text-emerald-700">{promoLabel}</span>
        </p>
      ) : (
        <p className="mt-1.5 text-xs text-slate-500">Sem preço promocional</p>
      )}
    </div>
  );
}

export function ReviewSectionCard({
  title,
  summary,
  open,
  onToggle,
  onEdit,
  children,
}: {
  title: string;
  summary: string;
  open: boolean;
  onToggle: () => void;
  onEdit?: () => void;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border bg-white shadow-sm ring-1 ring-slate-900/[0.03] transition-all duration-200 ease-out",
        open
          ? "border-emerald-200/80 shadow-md shadow-emerald-100/25"
          : "border-slate-200/80",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-4 sm:gap-4 sm:px-5",
          open ? "border-b border-slate-100/80 bg-gradient-to-r from-emerald-50/50 to-white" : "bg-slate-50/30",
        )}
      >
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left outline-none transition focus-visible:ring-2 focus-visible:ring-[#09bc8a]/40 focus-visible:ring-offset-2 sm:gap-4"
          onClick={onToggle}
          aria-expanded={open}
        >
          <span
            className={cn(
              "hidden h-9 w-1 shrink-0 rounded-full sm:block",
              open ? "bg-[#09bc8a]" : "bg-slate-200",
            )}
            aria-hidden
          />
          <div className="min-w-0 flex-1 space-y-0.5">
            <h3 className="text-sm font-bold tracking-tight text-[#0c1b33]">{title}</h3>
            <p className="line-clamp-2 text-sm text-slate-500">{summary}</p>
          </div>
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/80 text-slate-400 ring-1 ring-slate-200/80"
            aria-hidden
          >
            <ChevronDown
              className={cn(
                "size-5 transition-transform duration-200 ease-out",
                open && "rotate-180",
              )}
            />
          </span>
        </button>
        {onEdit ? (
          <button
            type="button"
            className="shrink-0 rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50/50 hover:text-emerald-800"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            Editar
          </button>
        ) : null}
      </div>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div
            className={cn(
              "space-y-4 border-t border-slate-100 px-5 pb-4 pt-4 transition-opacity duration-200 ease-out",
              open ? "opacity-100" : "opacity-0",
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

export function useReviewSections<T extends string>(initial: Record<T, boolean>) {
  const [openSections, setOpenSections] = useState(initial);
  const toggleSection = (id: T) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };
  return { openSections, toggleSection };
}
