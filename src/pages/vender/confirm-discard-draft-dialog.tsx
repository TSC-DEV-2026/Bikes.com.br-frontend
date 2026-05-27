import { useEffect, useId } from "react";

type ConfirmDiscardDraftDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDiscard: () => void;
};

export function ConfirmDiscardDraftDialog({
  open,
  onOpenChange,
  onDiscard,
}: ConfirmDiscardDraftDialogProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-950/45"
      role="presentation"
      onClick={() => onOpenChange(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed left-1/2 top-1/2 z-[60] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-lg font-bold tracking-tight text-[#0f2744] sm:text-xl">
          Cancelar cadastro?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          O rascunho salvo neste dispositivo será descartado.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
            onClick={() => onOpenChange(false)}
          >
            Continuar editando
          </button>
          <button
            type="button"
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-red-500 px-4 text-sm font-semibold text-white transition hover:bg-red-600 sm:w-auto"
            onClick={onDiscard}
          >
            Descartar e sair
          </button>
        </div>
      </div>
    </div>
  );
}
