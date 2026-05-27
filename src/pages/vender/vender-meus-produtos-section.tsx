import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Package } from "lucide-react";

import { listProdutos } from "@/api/endpoints/produtos.routes";
import { paths } from "@/api/endpoints";
import { Button } from "@/components/ui/button";
import { getAxiosErrorMessage } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import type { ProdutoListagemItem, ProdutoListagemResponse } from "@/types/produto";

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; items: ProdutoListagemItem[] };

function statusLabel(status: string | undefined): string {
  const s = (status ?? "").trim().toLowerCase();
  switch (s) {
    case "active":
      return "Publicado";
    case "draft":
      return "Rascunho";
    case "paused":
      return "Pausado";
    case "inactive":
      return "Inativo";
    default:
      return status?.trim() || "—";
  }
}

function formatBrl(value: string | number | null | undefined): string {
  if (value == null || value === "") return "—";
  if (typeof value === "number" && Number.isFinite(value)) {
    try {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 2,
      }).format(value);
    } catch {
      return String(value);
    }
  }
  const t = String(value).trim();
  if (!t) return "—";
  const n = Number(t.replace(/\s/g, "").replace(",", "."));
  if (Number.isFinite(n)) {
    try {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 2,
      }).format(n);
    } catch {
      return t;
    }
  }
  return t;
}

function formatCriadoEm(iso: string | undefined): string | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso.trim());
  if (Number.isNaN(d.getTime())) return iso.trim();
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

function ProdutoListagemThumb({ url }: { url: string | null }) {
  const [broken, setBroken] = useState(false);
  if (!url?.trim() || broken) {
    return (
      <div
        className="flex size-full items-center justify-center bg-slate-100 text-slate-400"
        aria-hidden
      >
        <Package className="size-8" />
      </div>
    );
  }
  return (
    <img
      src={url}
      alt=""
      className="size-full object-cover"
      loading="lazy"
      onError={() => setBroken(true)}
    />
  );
}

function extractItems(data: unknown, vendedorId: number): ProdutoListagemItem[] {
  if (!data || typeof data !== "object") return [];
  const items = (data as Partial<ProdutoListagemResponse>).items;
  if (!Array.isArray(items)) return [];
  return items.filter(
    (p) =>
      p &&
      typeof p === "object" &&
      Number((p as ProdutoListagemItem).vendedor_id) === vendedorId,
  ) as ProdutoListagemItem[];
}

type Props = {
  vendedorId: number;
};

export function VenderMeusProdutosSection({ vendedorId }: Props) {
  const location = useLocation();
  const [state, setState] = useState<LoadState>({ status: "idle" });

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const res = await listProdutos({
        vendedor_id: vendedorId,
        page: 1,
        page_size: 100,
      });
      const items = extractItems(res.data, vendedorId);
      setState({ status: "ok", items });
    } catch (e) {
      setState({
        status: "error",
        message: getAxiosErrorMessage(e, "Não foi possível carregar seus produtos."),
      });
    }
  }, [vendedorId]);

  useEffect(() => {
    void load();
  }, [vendedorId, location.key, load]);

  if (state.status === "idle" || state.status === "loading") {
    return null;
  }

  if (state.status === "ok" && state.items.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <h3 className="text-lg font-semibold tracking-tight text-slate-900">Meus produtos</h3>
          <p className="text-sm leading-relaxed text-slate-600">
            Acompanhe os produtos cadastrados na sua vitrine.
          </p>
        </div>
      </div>

      <div className="mt-6">
        {state.status === "error" ? (
          <div
            role="alert"
            className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950"
          >
            <p>{state.message}</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={() => void load()}
            >
              Tentar novamente
            </Button>
          </div>
        ) : null}

        {state.status === "ok" ? (
          <ul className="flex flex-col gap-3">
            {state.items.map((p) => {
              const hasPromo =
                p.preco_promocional != null &&
                p.preco_promocional !== "" &&
                !(typeof p.preco_promocional === "number" && !Number.isFinite(p.preco_promocional));
              const precoPrincipal = hasPromo ? formatBrl(p.preco_promocional) : formatBrl(p.preco);
              const precoOriginal =
                hasPromo && p.preco != null && p.preco !== "" ? formatBrl(p.preco) : null;
              const criado = formatCriadoEm(p.criado_em);
              const previewHref = paths.minhaLojaProduto(p.id);
              const editHref = paths.minhaLojaProdutoEditar(p.id);
              const publicHref = `/produtos/${encodeURIComponent(String(p.id))}`;
              const ativoBadge: ReactNode =
                p.ativo === undefined ? null : (
                  <span
                    className={cn(
                      "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                      p.ativo
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 bg-slate-100 text-slate-700",
                    )}
                  >
                    {p.ativo ? "Ativo" : "Inativo"}
                  </span>
                );
              const statusText = statusLabel(p.status);
              const shouldShowStatus = statusText !== "—";

              return (
                <li
                  key={p.id}
                  className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50/40 p-4 sm:flex-row sm:items-center sm:gap-4"
                >
                  <div className="flex min-w-0 flex-1 gap-3 sm:items-center">
                    <div className="relative size-20 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
                      <ProdutoListagemThumb url={p.imagem_principal_url} />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <p className="font-semibold leading-snug text-slate-900">{p.titulo}</p>
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <span className="text-base font-semibold text-emerald-700">
                          {precoPrincipal}
                        </span>
                        {precoOriginal && precoOriginal !== precoPrincipal ? (
                          <span className="text-sm text-slate-500 line-through">
                            {precoOriginal}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2 pt-0.5">
                        {shouldShowStatus ? (
                          <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-700">
                            {statusText}
                          </span>
                        ) : null}
                        {ativoBadge}
                        {criado ? (
                          <span className="inline-flex text-xs text-slate-500">Criado em {criado}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col gap-2 sm:w-auto sm:min-w-[11rem]">
                    <Button type="button" className="w-full sm:w-auto" asChild>
                      <Link to={previewHref}>Visualizar</Link>
                    </Button>
                    <Button type="button" variant="secondary" className="w-full sm:w-auto" asChild>
                      <Link to={editHref}>Editar</Link>
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
