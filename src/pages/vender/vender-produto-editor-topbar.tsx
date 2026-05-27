import { Eye, Loader2, RotateCcw, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  dirty: boolean;
  saving: boolean;
  previewOnly: boolean;
  saveError: string | null;
  onVisualizar: () => void;
  onCancel: () => void;
  onSave: () => void;
};

export function VenderProdutoEditorTopbar({
  dirty,
  saving,
  previewOnly,
  saveError,
  onVisualizar,
  onCancel,
  onSave,
}: Props) {
  return (
    <div
      role="region"
      aria-label="Barra de edição do produto"
      className="sticky top-[4.5rem] z-40 -mx-4 mb-4 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur-sm sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
    >
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-0.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Modo editor
          </p>
          <h2 className="break-words text-base font-semibold text-slate-900 sm:text-lg">
            Editando produto
          </h2>
          <p
            className={cn(
              "text-xs font-medium",
              dirty ? "text-amber-700" : "text-slate-500",
            )}
          >
            {dirty ? "Alterações não salvas" : "Rascunho local sincronizado"}
          </p>
          {saveError ? (
            <p className="text-xs text-destructive" role="alert">
              {saveError}
            </p>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full gap-2 sm:w-auto"
            onClick={onVisualizar}
          >
            <Eye className="size-4 shrink-0" aria-hidden />
            {previewOnly ? "Editar" : "Visualizar"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full gap-2 sm:w-auto"
            onClick={onCancel}
            disabled={saving}
          >
            <RotateCcw className="size-4 shrink-0" aria-hidden />
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            className="w-full gap-2 sm:w-auto"
            onClick={onSave}
            disabled={saving || !dirty}
          >
            {saving ? (
              <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
            ) : (
              <Save className="size-4 shrink-0" aria-hidden />
            )}
            {saving ? "Atualizando…" : "Atualizar produto"}
          </Button>
        </div>
      </div>
    </div>
  );
}
