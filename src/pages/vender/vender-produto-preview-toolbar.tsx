import { Link } from "react-router-dom";
import { ExternalLink, Pencil, Store } from "lucide-react";

import { paths } from "@/api/endpoints";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  produtoId: number | string;
  lojaAtiva: boolean;
  editDisabled: boolean;
};

export function VenderProdutoPreviewToolbar({
  produtoId,
  lojaAtiva,
  editDisabled,
}: Props) {
  const publicHref = `/produtos/${encodeURIComponent(String(produtoId))}`;
  const editHref = paths.minhaLojaProdutoEditar(produtoId);

  return (
    <aside
      role="region"
      aria-label="Modo vendedor"
      className={cn(
        "sticky top-[4.5rem] z-30 mb-2 w-full max-w-full rounded-2xl border border-slate-200/90 bg-white/95 px-4 py-4 shadow-sm backdrop-blur-sm sm:mb-4 sm:px-5",
        !lojaAtiva && "border-amber-200/80 bg-amber-50/50",
      )}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 max-w-full space-y-1 break-words">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Modo vendedor
          </p>
          <p className="text-sm font-medium leading-snug text-slate-900">
            Você está visualizando este anúncio como comprador.
          </p>
          {!lojaAtiva ? (
            <p className="text-xs leading-relaxed break-words text-amber-900">
              Loja inativa na plataforma: compradores não veem suas ofertas na vitrine até você
              reativar na Minha loja.
            </p>
          ) : null}
          {editDisabled ? (
            <p className="text-xs leading-relaxed break-words text-red-900">
              Conta bloqueada: a edição fica indisponível. A pré-visualização permanece apenas para
              conferência.
            </p>
          ) : null}
        </div>
        <div className="flex w-full min-w-0 flex-shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end lg:max-w-none">
          {editDisabled ? (
            <Button
              type="button"
              size="sm"
              variant="default"
              className="w-full gap-2 sm:w-auto"
              disabled
            >
              <Pencil className="size-4" aria-hidden />
              Editar produto
            </Button>
          ) : (
            <Button type="button" size="sm" variant="default" className="w-full gap-2 sm:w-auto" asChild>
              <Link to={editHref}>
                <Pencil className="size-4" aria-hidden />
                Editar produto
              </Link>
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full gap-2 sm:w-auto"
            asChild
          >
            <Link to={publicHref} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4 shrink-0" aria-hidden />
              Abrir página pública
            </Link>
          </Button>
          <Button type="button" size="sm" variant="secondary" className="w-full gap-2 sm:w-auto" asChild>
            <Link to={paths.minhaLoja()}>
              <Store className="size-4" aria-hidden />
              Voltar para Minha loja
            </Link>
          </Button>
        </div>
      </div>
    </aside>
  );
}
