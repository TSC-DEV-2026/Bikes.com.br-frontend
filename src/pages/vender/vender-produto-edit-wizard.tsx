import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { updateProduto } from "@/api/endpoints/produtos.routes";
import { Button } from "@/components/ui/button";
import { getAxiosErrorMessage } from "@/lib/api-error";
import { notifySuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { ProdutoDetalheView } from "@/types/produto";
import {
  buildUpdatePayloadFromDraft,
  validateEditorDraft,
  validateWizardStep1,
  validateWizardStep2,
  validateWizardStep3,
  validateWizardStep4,
} from "@/pages/vender/vender-produto-editor-utils";
import { useVenderProdutoEditCatalog } from "@/pages/vender/use-vender-produto-edit-catalog";
import type { ProdutoImagesEditPanelHandle } from "@/pages/vender/vender-produto-images-manager";
import {
  WizardStepCategoriaMarca,
  WizardStepImagens,
  WizardStepMedidas,
  WizardStepPreco,
  WizardStepPrincipais,
  WizardStepRevisao,
} from "@/pages/vender/vender-produto-edit-wizard-steps";

const TOTAL_STEPS = 6;

const WIZARD_CARD_SHELL =
  "relative w-full min-w-0 overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_12px_48px_-16px_rgba(12,27,51,0.14)] ring-1 ring-slate-900/[0.04]";

const WIZARD_PRIMARY_BTN =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#09bc8a] to-emerald-600 px-6 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition hover:from-emerald-600 hover:to-emerald-700 hover:shadow-lg disabled:pointer-events-none disabled:opacity-50 sm:w-auto sm:min-w-[148px]";

const WIZARD_BACK_BTN =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200/90 bg-white px-5 text-sm font-semibold text-[#0c1b33] shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50 sm:w-auto";

const STEP_META: { title: string; description: string }[] = [
  {
    title: "Dados principais",
    description: "Título, descrição, condição e visibilidade do anúncio.",
  },
  {
    title: "Categoria e marca",
    description: "Classifique o produto e escolha a marca do anúncio.",
  },
  {
    title: "Preço e disponibilidade",
    description: "Defina valores e identificação opcional (SKU).",
  },
  {
    title: "Medidas e dados opcionais",
    description: "Slug e dimensões para logística e URL amigável.",
  },
  {
    title: "Fotografias",
    description: "Veja a galeria publicada e envie novas fotos do anúncio.",
  },
  {
    title: "Revisão",
    description: "Confira tudo antes de salvar as alterações.",
  },
];

type Props = {
  produtoId: string;
  produto: ProdutoDetalheView;
  rawPayload: unknown;
  previewHref: string;
  onImagensChange: (imagens: ProdutoDetalheView["imagensGaleria"]) => void;
  onProdutoRefresh?: () => Promise<void>;
};

function EditWizardProgressPanel({
  step,
  compact = false,
}: {
  step: number;
  compact?: boolean;
}) {
  const progressPct = (step / TOTAL_STEPS) * 100;
  const current = STEP_META[step - 1];

  const progressBar = (
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100/90">
      <div
        className="h-full rounded-full bg-gradient-to-r from-[#09bc8a] to-emerald-500 transition-all duration-500 ease-out"
        style={{ width: `${progressPct}%` }}
        role="progressbar"
        aria-valuenow={step}
        aria-valuemin={1}
        aria-valuemax={TOTAL_STEPS}
      />
    </div>
  );

  const stepList = (
    <ol className="relative mt-4 space-y-0.5">
      {STEP_META.map((item, index) => {
        const stepNum = index + 1;
        const isCurrent = step === stepNum;
        const isDone = step > stepNum;
        const isLast = index === STEP_META.length - 1;
        return (
          <li
            key={item.title}
            className={cn(
              "relative flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
              isCurrent &&
                "border border-emerald-200/80 bg-gradient-to-r from-emerald-50 to-white font-medium text-emerald-950 shadow-sm",
              isDone && !isCurrent && "text-slate-700",
              step < stepNum && "text-slate-400",
            )}
            aria-current={isCurrent ? "step" : undefined}
          >
            {!isLast ? (
              <span
                className={cn(
                  "absolute left-[1.35rem] top-9 bottom-0 w-px -translate-x-1/2",
                  isDone ? "bg-emerald-300" : "bg-slate-200",
                )}
                aria-hidden
              />
            ) : null}
            <span
              className={cn(
                "relative z-[1] mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ring-2 ring-white",
                isCurrent && "bg-[#09bc8a] text-white shadow-md shadow-emerald-500/30",
                isDone && !isCurrent && "bg-emerald-100 text-emerald-800",
                step < stepNum && "bg-slate-100 text-slate-400",
              )}
            >
              {isDone && !isCurrent ? (
                <Check className="size-3.5" strokeWidth={2.5} aria-hidden />
              ) : (
                stepNum
              )}
            </span>
            <span className="min-w-0 pt-0.5 leading-snug">{item.title}</span>
          </li>
        );
      })}
    </ol>
  );

  const mobilePills = (
    <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {STEP_META.map((item, index) => {
        const stepNum = index + 1;
        const isCurrent = step === stepNum;
        const isDone = step > stepNum;
        return (
          <span
            key={item.title}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold",
              isCurrent && "border-emerald-300 bg-emerald-50 text-emerald-900",
              isDone && !isCurrent && "border-emerald-100 bg-white text-emerald-800",
              !isCurrent && !isDone && "border-slate-200 bg-white text-slate-400",
            )}
          >
            {isDone && !isCurrent ? <Check className="size-3" aria-hidden /> : stepNum}
            <span className="max-w-[6.5rem] truncate">{item.title}</span>
          </span>
        );
      })}
    </div>
  );

  return (
    <aside
      className={cn(
        WIZARD_CARD_SHELL,
        "bg-gradient-to-b from-white to-slate-50/80",
        compact ? "p-4 sm:p-5 lg:hidden" : "hidden p-5 lg:block lg:sticky lg:top-24 lg:self-start",
      )}
      aria-label="Progresso da edição"
    >
      <div className="flex items-center gap-2 text-[#0c1b33]">
        <span className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#09bc8a]/15 to-[#0c1b33]/5 text-[#09bc8a]">
          <Sparkles className="size-4" aria-hidden />
        </span>
        <h2 className="text-base font-bold tracking-tight">Editar produto</h2>
      </div>
      <p className="mt-2 text-sm text-slate-600">Atualize o anúncio em etapas e revise antes de salvar.</p>
      {compact ? (
        <>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
            Etapa {step} de {TOTAL_STEPS}
          </p>
          <p className="mt-1 text-sm font-semibold text-[#0c1b33]">{current.title}</p>
          {progressBar}
          {mobilePills}
        </>
      ) : (
        <>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Etapa {step} de {TOTAL_STEPS}
          </p>
          {progressBar}
          {stepList}
        </>
      )}
    </aside>
  );
}

export function VenderProdutoEditWizard({
  produtoId,
  produto,
  rawPayload,
  previewHref,
  onImagensChange,
  onProdutoRefresh,
}: Props) {
  const navigate = useNavigate();
  const imagesPanelRef = useRef<ProdutoImagesEditPanelHandle>(null);
  const [step, setStep] = useState(1);
  const [stepError, setStepError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [flushingImages, setFlushingImages] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const catalog = useVenderProdutoEditCatalog(rawPayload, produto);
  const fieldDisabled = submitting || flushingImages || catalog.catalogLoading;

  const catalogProps = {
    draft: catalog.draft,
    patch: (partial: Parameters<typeof catalog.patch>[0]) => {
      catalog.patch(partial);
      setStepError(null);
      setSaveError(null);
    },
    disabled: fieldDisabled,
    categoriasPai: catalog.categoriasPai,
    subcategorias: catalog.subcategorias,
    marcas: catalog.marcas,
    marcaAtual: catalog.marcaAtual,
    setMarcaAtual: catalog.setMarcaAtual,
    subsLoading: catalog.subsLoading,
    loadMarcas: catalog.loadMarcas,
  };

  const validateCurrentStep = (): string | null => {
    switch (step) {
      case 1:
        return validateWizardStep1(catalog.draft);
      case 2:
        return validateWizardStep2(catalog.draft);
      case 3:
        return validateWizardStep3(catalog.draft);
      case 4:
        return validateWizardStep4(catalog.draft);
      case 5:
        return null;
      default:
        return null;
    }
  };

  const flushPendingImages = async (): Promise<boolean> => {
    const panel = imagesPanelRef.current;
    if (!panel?.hasPendingImages()) return true;
    setFlushingImages(true);
    try {
      return await panel.publishPendingImages();
    } finally {
      setFlushingImages(false);
    }
  };

  const handleNext = () => {
    void (async () => {
      const err = validateCurrentStep();
      if (err) {
        setStepError(err);
        toast.error(err);
        return;
      }

      if (step === 5) {
        const uploaded = await flushPendingImages();
        if (!uploaded) return;
      }

      setStepError(null);
      setStep((s) => Math.min(TOTAL_STEPS, s + 1));
    })();
  };

  const handleBack = () => {
    setStepError(null);
    setStep((s) => Math.max(1, s - 1));
  };

  const handleSave = async () => {
    if (fieldDisabled) return;
    const err = validateEditorDraft(catalog.draft);
    if (err) {
      setStepError(err);
      toast.error(err);
      return;
    }
    const payload = buildUpdatePayloadFromDraft(catalog.draft);
    if (!payload) {
      toast.error("Revise os campos antes de salvar.");
      return;
    }

    setSubmitting(true);
    setSaveError(null);
    try {
      const uploaded = await flushPendingImages();
      if (!uploaded) return;

      await updateProduto(produtoId, payload);
      notifySuccess("Alterações salvas", "O produto foi atualizado com sucesso.");
      navigate(previewHref, { replace: false });
    } catch (e) {
      const msg = getAxiosErrorMessage(e, "Não foi possível salvar as alterações.");
      setSaveError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const progressPct = (step / TOTAL_STEPS) * 100;
  const meta = STEP_META[step - 1];

  if (catalog.catalogLoading) {
    return (
      <div
        className={cn("mx-auto w-full max-w-7xl", WIZARD_CARD_SHELL, "p-12")}
        role="status"
        aria-busy="true"
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="size-10 animate-spin text-[#09bc8a]" aria-hidden />
          <p className="text-sm font-medium text-slate-600">Carregando dados do produto…</p>
        </div>
      </div>
    );
  }

  if (catalog.catalogError) {
    return (
      <div
        role="alert"
        className={cn(
          "mx-auto w-full max-w-7xl rounded-3xl border border-red-200/80 bg-red-50/90 px-6 py-8 text-sm text-red-900 shadow-lg",
        )}
      >
        {catalog.catalogError}
      </div>
    );
  }

  return (
    <div className="product-create-form mx-auto w-full max-w-7xl pb-8 sm:pb-12">
      <div className="grid w-full min-w-0 gap-5 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] lg:items-start lg:gap-8">
        <EditWizardProgressPanel step={step} />
        <div className="flex min-w-0 flex-col gap-4 lg:gap-5">
          <EditWizardProgressPanel step={step} compact />
          <div className={WIZARD_CARD_SHELL}>
            <div className="h-1 bg-slate-100/80" aria-hidden>
              <div
                className="h-full bg-gradient-to-r from-[#09bc8a] via-emerald-500 to-[#0c1b33]/80 transition-all duration-500 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <div className="flex items-start justify-between gap-4 border-b border-slate-100/90 bg-gradient-to-br from-slate-50/90 via-white to-emerald-50/25 px-4 py-6 sm:gap-6 sm:px-8 sm:py-7">
              <div className="min-w-0 flex-1">
                <p className="inline-flex rounded-full border border-emerald-200/80 bg-emerald-50/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-800">
                  Etapa {step} de {TOTAL_STEPS}
                </p>
                <h2 className="mt-3 text-2xl font-bold tracking-tight text-[#0c1b33] sm:text-[1.65rem]">
                  {meta.title}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                  {meta.description}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-10 shrink-0 rounded-xl border border-slate-200/90 text-slate-500 shadow-sm hover:bg-slate-50 hover:text-slate-800"
                disabled={submitting}
                asChild
              >
                <Link to={previewHref} aria-label="Sair da edição">
                  <X className="size-4" aria-hidden />
                </Link>
              </Button>
            </div>

            <div className="px-4 py-2 sm:px-8 sm:py-2">
              {stepError ? (
                <p
                  className="mb-5 rounded-2xl border border-amber-200/90 bg-amber-50/90 px-4 py-3.5 text-sm text-amber-950 shadow-sm"
                  role="alert"
                >
                  {stepError}
                </p>
              ) : null}
              {saveError && step === TOTAL_STEPS ? (
                <p
                  className="mb-5 rounded-2xl border border-red-200/90 bg-red-50/90 px-4 py-3.5 text-sm text-red-900 shadow-sm"
                  role="alert"
                >
                  {saveError}
                </p>
              ) : null}

              {step === 1 ? <WizardStepPrincipais {...catalogProps} /> : null}
              {step === 2 ? <WizardStepCategoriaMarca {...catalogProps} /> : null}
              {step === 3 ? <WizardStepPreco {...catalogProps} /> : null}
              {step === 4 ? <WizardStepMedidas {...catalogProps} /> : null}
              {step >= 5 ? (
                <div className={cn(step !== 5 && "hidden")} aria-hidden={step !== 5}>
                  <WizardStepImagens
                    ref={imagesPanelRef}
                    produtoId={produtoId}
                    imagens={produto.imagensGaleria}
                    disabled={fieldDisabled}
                    onImagensChange={onImagensChange}
                    onUploaded={onProdutoRefresh}
                  />
                </div>
              ) : null}
              {step === 6 ? (
                <WizardStepRevisao {...catalogProps} imagensGaleria={produto.imagensGaleria} />
              ) : null}
            </div>

            <footer className="flex flex-col gap-3 border-t border-slate-100/90 bg-slate-50/60 px-4 py-5 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-6">
              <div className="min-w-0">
                {step > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className={WIZARD_BACK_BTN}
                    disabled={submitting}
                    onClick={handleBack}
                  >
                    <ArrowLeft className="size-4 shrink-0" aria-hidden />
                    Voltar
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    className={cn(WIZARD_BACK_BTN, "text-slate-600")}
                    disabled={submitting}
                    asChild
                  >
                    <Link to={previewHref}>Cancelar</Link>
                  </Button>
                )}
              </div>
              <div className="min-w-0 sm:ml-auto">
                {step < TOTAL_STEPS ? (
                  <Button
                    type="button"
                    className={WIZARD_PRIMARY_BTN}
                    disabled={fieldDisabled}
                    onClick={handleNext}
                  >
                    {flushingImages ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                        Enviando fotos…
                      </>
                    ) : (
                      <>
                        Continuar
                        <ArrowRight className="size-4 shrink-0" aria-hidden />
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className={cn(WIZARD_PRIMARY_BTN, "sm:min-w-[180px]")}
                    disabled={fieldDisabled}
                    onClick={() => void handleSave()}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                        Salvando…
                      </>
                    ) : (
                      "Salvar alterações"
                    )}
                  </Button>
                )}
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}

