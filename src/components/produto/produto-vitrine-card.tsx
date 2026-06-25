import { Link } from "react-router-dom";
import { FaArrowRight, FaBicycle } from "react-icons/fa6";
import { Heart, Loader2 } from "lucide-react";

import type { ProdutoId, ProdutoListaView } from "@/types/produto";
import { cn } from "@/lib/utils";

function parsePrecoBRLNumber(raw: string | null | undefined): number | null {
  if (!raw?.trim()) return null;
  const n = raw
    .replace(/\s/g, "")
    .replace(/R\$\s*/i, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const v = Number.parseFloat(n);
  return Number.isFinite(v) && v > 0 ? v : null;
}

/** Desconto máximo plausível na listagem /produtos (variant search). */
const MAX_PLAUSIBLE_DISCOUNT_RATIO = 0.75;

type VitrineDiscountDisplay = {
  percent: number;
  label: string;
};

/** Percentual visual a partir de preço original e atual (sem alterar dados da API). */
function resolveVitrineDiscountDisplay(
  precoTexto: string | null,
  precoOriginalTexto: string | null | undefined,
): VitrineDiscountDisplay | null {
  const atual = parsePrecoBRLNumber(precoTexto);
  const original = parsePrecoBRLNumber(precoOriginalTexto);
  if (atual == null || original == null || original <= atual) return null;
  const ratio = (original - atual) / original;
  if (!Number.isFinite(ratio) || ratio <= 0) return null;
  const percent = Math.round(ratio * 100);
  if (percent <= 0) return null;
  return { percent, label: `${percent}% OFF` };
}

/** Exibe preço riscado na listagem /produtos (heurística conservadora). */
function shouldShowPrecoOriginalSearch(
  precoTexto: string | null,
  precoOriginalTexto: string | null | undefined,
): boolean {
  const discount = resolveVitrineDiscountDisplay(precoTexto, precoOriginalTexto);
  if (!discount) return false;
  return discount.percent / 100 <= MAX_PLAUSIBLE_DISCOUNT_RATIO;
}

/** Exibe preço riscado na home pública quando original > atual. */
function shouldShowPrecoOriginalHome(
  precoTexto: string | null,
  precoOriginalTexto: string | null | undefined,
): boolean {
  return resolveVitrineDiscountDisplay(precoTexto, precoOriginalTexto) != null;
}

function DescontoBadgeHome({ label }: { label: string }) {
  return (
    <span
      className="absolute left-1.5 top-1.5 z-10 inline-flex max-w-[calc(100%-3rem)] items-center rounded-md bg-[#09bc8a] px-1.5 py-0.5 text-[10px] font-bold uppercase leading-tight tracking-wide text-white shadow-sm"
      aria-label={`Desconto de ${label.replace(/\s*OFF$/i, "")}`}
    >
      {label}
    </span>
  );
}

function PrecoVitrineHome({
  precoTexto,
  precoOriginalTexto,
  className,
}: {
  precoTexto: string | null;
  precoOriginalTexto?: string | null;
  className?: string;
}) {
  const raw = precoTexto?.trim();
  const showOriginal = shouldShowPrecoOriginalHome(
    precoTexto,
    precoOriginalTexto ?? null,
  );
  const originalRaw = showOriginal ? precoOriginalTexto?.trim() : null;

  if (!raw) {
    return (
      <p
        className={cn(
          "flex min-h-[2.5rem] items-end text-sm font-medium text-gray-500",
          className,
        )}
      >
        Preço sob consulta
      </p>
    );
  }

  const m = raw.match(/^R\$\s*([\d.]+)(,\d{2})?$/i);

  return (
    <div
      className={cn(
        "flex min-h-[2.5rem] flex-col justify-end gap-0.5",
        className,
      )}
    >
      {originalRaw ? (
        <p className="text-xs font-medium text-gray-400 line-through">
          {originalRaw}
        </p>
      ) : (
        <span className="block h-[0.875rem]" aria-hidden />
      )}
      {m ? (
        <div className="flex items-baseline gap-0.5 text-[#09bc8a]">
          <span className="text-xs font-bold">R$</span>
          <span className="text-xl font-bold leading-none tracking-tight sm:text-2xl">
            {m[1]}
          </span>
          {m[2] ? (
            <span className="text-xs font-bold">{m[2]}</span>
          ) : null}
        </div>
      ) : (
        <p className="text-lg font-bold leading-tight text-[#09bc8a] sm:text-xl">
          {raw}
        </p>
      )}
    </div>
  );
}

function PrecoVitrineSearch({
  precoTexto,
  precoOriginalTexto,
  className,
}: {
  precoTexto: string | null;
  precoOriginalTexto?: string | null;
  className?: string;
}) {
  const raw = precoTexto?.trim();
  const showOriginal = shouldShowPrecoOriginalSearch(
    precoTexto,
    precoOriginalTexto ?? null,
  );
  const originalRaw = showOriginal ? precoOriginalTexto?.trim() : null;

  if (!raw) {
    return (
      <p
        className={cn(
          "flex min-h-[2rem] items-end text-sm font-medium text-gray-500 sm:min-h-[2.5rem]",
          className,
        )}
      >
        Preço sob consulta
      </p>
    );
  }

  const m = raw.match(/^R\$\s*([\d.]+)(,\d{2})?$/i);

  return (
    <div
      className={cn(
        "flex min-h-[2rem] flex-col justify-end gap-0.5 sm:min-h-[2.5rem]",
        className,
      )}
    >
      {originalRaw ? (
        <p className="text-xs font-medium text-gray-400 line-through">
          {originalRaw}
        </p>
      ) : (
        <span className="block h-[0.875rem]" aria-hidden />
      )}
      {m ? (
        <div className="flex items-baseline gap-0.5 text-[#09bc8a]">
          <span className="text-xs font-bold">R$</span>
          <span className="text-xl font-bold leading-none tracking-tight sm:text-2xl">
            {m[1]}
          </span>
          {m[2] ? (
            <span className="text-xs font-bold">{m[2]}</span>
          ) : null}
        </div>
      ) : (
        <p className="text-lg font-bold leading-tight text-[#09bc8a] sm:text-xl">
          {raw}
        </p>
      )}
    </div>
  );
}

export type ProdutoVitrineCardVariant = "home" | "search";

export type ProdutoVitrineCardProps = {
  produto: ProdutoListaView;
  href: string;
  favoriteIds: Set<string>;
  pendingFavoriteIds: Set<string>;
  onToggleFavorite: (id: ProdutoId) => void;
  /** Quando informado, o botão de favorito redireciona ao login em vez de alternar. */
  loginHref?: string;
  /** `home`: vitrine/carrossel (padrão). `search`: listagem /produtos. */
  variant?: ProdutoVitrineCardVariant;
};

export function ProdutoVitrineCard({
  produto: p,
  href,
  favoriteIds,
  pendingFavoriteIds,
  onToggleFavorite,
  loginHref,
  variant = "home",
}: ProdutoVitrineCardProps) {
  const key = String(p.id);
  const isFav = favoriteIds.has(key);
  const isFavPending = pendingFavoriteIds.has(key);
  const isGuest = Boolean(loginHref);
  const isSearch = variant === "search";
  const hasChipMeta = Boolean(p.condicaoLabel || p.categoriaLabel);
  const homeDiscount = !isSearch
    ? resolveVitrineDiscountDisplay(p.precoTexto, p.precoOriginalTexto)
    : null;

  const favoriteButton = loginHref ? (
    <Link
      to={loginHref}
      aria-label="Fazer login para favoritar"
      title="Fazer login para favoritar"
      className="absolute right-1.5 top-1.5 inline-flex size-8 items-center justify-center rounded-full border border-gray-200/80 bg-white/95 text-gray-500 shadow-sm transition-colors hover:text-red-500"
    >
      <Heart className="size-3.5" aria-hidden />
    </Link>
  ) : (
    <button
      type="button"
      onClick={() => void onToggleFavorite(p.id)}
      disabled={isFavPending}
      aria-pressed={isFav}
      aria-label={
        isFav ? "Remover dos favoritos" : "Adicionar aos favoritos"
      }
      title={isFav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      className={cn(
        "absolute right-1.5 top-1.5 inline-flex size-8 items-center justify-center rounded-full border bg-white/95 shadow-sm transition-colors disabled:opacity-60",
        isFav
          ? "border-red-200 text-red-500"
          : "border-gray-200/80 text-gray-500 hover:text-red-500",
      )}
    >
      {isFavPending ? (
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
      ) : (
        <Heart
          className={cn("size-3.5", isFav && "fill-red-500")}
          aria-hidden
        />
      )}
    </button>
  );

  return (
    <article
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:border-[#09bc8a]/35 hover:shadow-md",
        "h-full w-full",
      )}
    >
      <div className="relative">
        <Link
          to={href}
          className={cn(
            "block bg-gray-50 p-2",
            isSearch
              ? "h-40 max-h-40 overflow-hidden sm:aspect-[4/3] sm:h-auto sm:max-h-none sm:p-3"
              : "aspect-[4/3] sm:p-3",
          )}
        >
          {p.imagemUrl ? (
            <img
              src={p.imagemUrl}
              alt=""
              className="h-full w-full object-contain"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center">
              <FaBicycle className="text-gray-200" aria-hidden size={48} />
            </span>
          )}
        </Link>
        {homeDiscount ? (
          <DescontoBadgeHome label={homeDiscount.label} />
        ) : null}
        {favoriteButton}
      </div>

      {isSearch ? (
        <div className="flex flex-1 flex-col p-2 pt-1.5 sm:p-2.5">
          <Link
            to={href}
            className="line-clamp-2 min-h-[2.25rem] text-left text-sm font-semibold leading-snug text-gray-900 hover:text-[#09bc8a] sm:min-h-[2.5rem]"
          >
            {p.titulo}
          </Link>

          {hasChipMeta ? (
            <div className="mt-1 flex flex-wrap items-start gap-1">
              {p.condicaoLabel ? (
                <span className="inline-flex rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                  {p.condicaoLabel}
                </span>
              ) : null}
              {p.categoriaLabel ? (
                <span className="inline-flex rounded-md border border-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                  {p.categoriaLabel}
                </span>
              ) : null}
            </div>
          ) : null}

          {p.localizacaoLabel ? (
            <p className="mt-0.5 text-xs text-gray-500">{p.localizacaoLabel}</p>
          ) : null}

          {p.publicadoLabel ? (
            <p className="text-[10px] text-gray-400">{p.publicadoLabel}</p>
          ) : null}

          <PrecoVitrineSearch
            precoTexto={p.precoTexto}
            precoOriginalTexto={p.precoOriginalTexto}
            className="mt-1"
          />

          {!isGuest ? (
            <p
              className={cn(
                "mt-1 min-h-[1rem] text-xs",
                isFav ? "text-red-500" : "invisible",
              )}
            >
              {isFav ? "Salvo nos favoritos" : "\u00a0"}
            </p>
          ) : null}

          <div className="hidden min-h-0 flex-1 sm:block" aria-hidden />

          <Link
            to={href}
            className="mt-1.5 flex w-full shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-[#09bc8a]/40 bg-white px-3 py-2 text-sm font-bold text-[#078f6f] transition hover:border-[#09bc8a] hover:bg-[#09bc8a]/5 sm:mt-0"
          >
            Ver produto
            <FaArrowRight className="size-3" aria-hidden />
          </Link>
        </div>
      ) : (
        <div className="flex flex-1 flex-col p-3 pt-2 sm:p-3">
          <Link
            to={href}
            className="line-clamp-2 min-h-[2.5rem] text-left text-sm font-semibold leading-snug text-gray-900 hover:text-[#09bc8a]"
          >
            {p.titulo}
          </Link>

          <div className="mt-1.5 flex min-h-[1.375rem] flex-wrap items-start gap-1">
            {p.condicaoLabel ? (
              <span className="inline-flex rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                {p.condicaoLabel}
              </span>
            ) : null}
            {p.categoriaLabel ? (
              <span className="inline-flex rounded-md border border-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                {p.categoriaLabel}
              </span>
            ) : null}
          </div>

          {p.localizacaoLabel ? (
            <p className="mt-1 text-xs text-gray-500">{p.localizacaoLabel}</p>
          ) : null}

          {p.publicadoLabel ? (
            <p className="text-[10px] text-gray-400">{p.publicadoLabel}</p>
          ) : null}

          <PrecoVitrineHome
            precoTexto={p.precoTexto}
            precoOriginalTexto={p.precoOriginalTexto}
            className="mt-2"
          />

          {!isGuest ? (
            <p
              className={cn(
                "mt-1 min-h-[1rem] text-xs",
                isFav ? "text-red-500" : "invisible",
              )}
            >
              {isFav ? "Salvo nos favoritos" : "\u00a0"}
            </p>
          ) : null}

          <div className="min-h-0 flex-1" aria-hidden />

          <Link
            to={href}
            className="mt-auto flex w-full shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[#09bc8a]/40 bg-white px-3 py-2 text-sm font-bold text-[#078f6f] transition hover:border-[#09bc8a] hover:bg-[#09bc8a]/5"
          >
            Ver produto
            <FaArrowRight className="size-3" aria-hidden />
          </Link>
        </div>
      )}
    </article>
  );
}
