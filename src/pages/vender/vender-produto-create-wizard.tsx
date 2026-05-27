import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Cloud, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { paths } from "@/api/endpoints";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { venderProdutoSecondaryButtonClass } from "@/pages/vender/vender-produto-editor-utils";
import { validateCreateWizardStep } from "@/pages/vender/vender-produto-create-utils";
import {
  CreateStepCaracteristicas,
  CreateStepCategoriaMarca,
  CreateStepImagens,
  CreateStepOpcionais,
  CreateStepPrecoEstoque,
  CreateStepPrincipais,
  CreateStepRevisao,
} from "@/pages/vender/vender-produto-create-wizard-steps";
import { ConfirmDiscardDraftDialog } from "@/pages/vender/confirm-discard-draft-dialog";
import {
  useVenderProdutoCreate,
  type UseVenderProdutoCreateOptions,
} from "@/pages/vender/use-vender-produto-create";

const TOTAL_STEPS = 7;

const WIZARD_CARD_SHELL =
  "relative w-full min-w-0 overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_12px_48px_-16px_rgba(12,27,51,0.14)] ring-1 ring-slate-900/[0.04]";

const WIZARD_PRIMARY_BTN =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#09bc8a] to-emerald-600 px-6 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition hover:from-emerald-600 hover:to-emerald-700 hover:shadow-lg disabled:pointer-events-none disabled:opacity-50 sm:w-auto sm:min-w-[148px]";

const WIZARD_BACK_BTN =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200/90 bg-white px-5 text-sm font-semibold text-[#0c1b33] shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50 sm:w-auto";

const WIZARD_CANCEL_BTN =
  "inline-flex h-11 w-full items-center justify-center rounded-xl border border-slate-200/90 bg-white px-5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 disabled:pointer-events-none disabled:opacity-50 sm:w-auto";

function WizardStepPanel({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  if (!active) return null;
  return <div>{children}</div>;
}

const STEP_META: { title: string; description: string; stepHint?: string }[] = [
  {
    title: "Dados principais",
    description:
      "Essas informações aparecem no anúncio e ajudam o comprador a entender o produto.",
    stepHint: "Título, descrição, condição e visibilidade do anúncio.",
  },
  {
    title: "Categoria e marca",
    description: "Classifique o produto e escolha a marca do anúncio.",
  },
  {
    title: "Preço e estoque",
    description: "Defina valores, estoque inicial e SKU opcional.",
  },
  {
    title: "Imagens",
    description: "Envie fotos do produto e escolha a imagem de capa.",
  },
  {
    title: "Detalhes do produto",
    description: "Preencha os detalhes obrigatórios da categoria e características extras.",
  },
  {
    title: "Dados opcionais",
    description: "Medidas para logística do produto.",
  },
  {
    title: "Revisão",
    description: "Confira tudo antes de cadastrar o produto.",
  },
];

export type VenderProdutoCreateWizardProps = UseVenderProdutoCreateOptions;

type WizardProgressPanelProps = {
  step: number;
  totalSteps: number;
  compact?: boolean;
  showDraftHint?: boolean;
};

function WizardProgressPanel({
  step,
  totalSteps,
  compact = false,
  showDraftHint = false,
}: WizardProgressPanelProps) {
  const [stepsOpen, setStepsOpen] = useState(false);
  const progressPct = (step / totalSteps) * 100;
  const currentStepMeta = STEP_META[step - 1];

  const progressBar = (
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100/90">
      <div
        className="h-full rounded-full bg-gradient-to-r from-[#09bc8a] to-emerald-500 transition-all duration-500 ease-out"
        style={{ width: `${progressPct}%` }}
        role="progressbar"
        aria-valuenow={step}
        aria-valuemin={1}
        aria-valuemax={totalSteps}
      />
    </div>
  );

  const renderStepList = (listClassName?: string) => (
    <ol className={cn("relative space-y-0.5", listClassName)}>
      {STEP_META.map((item, index) => {
        const stepNum = index + 1;
        const isCurrent = step === stepNum;
        const isDone = step > stepNum;
        const isFuture = step < stepNum;
        const isLast = index === STEP_META.length - 1;
        return (
          <li
            key={item.title}
            className={cn(
              "relative flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
              isCurrent &&
                "border border-emerald-200/80 bg-gradient-to-r from-emerald-50 to-white font-medium text-emerald-950 shadow-sm shadow-emerald-100/60",
              isDone && !isCurrent && "text-slate-700",
              isFuture && "text-slate-400",
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
                isFuture && "bg-slate-100 text-slate-400",
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

  const renderMobileStepPills = () => (
    <div
      className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="list"
      aria-label="Etapas do cadastro"
    >
      {STEP_META.map((item, index) => {
        const stepNum = index + 1;
        const isCurrent = step === stepNum;
        const isDone = step > stepNum;
        return (
          <span
            key={item.title}
            role="listitem"
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
              isCurrent &&
                "border-emerald-300 bg-emerald-50 text-emerald-900 shadow-sm",
              isDone && !isCurrent && "border-emerald-100 bg-white text-emerald-800",
              !isCurrent && !isDone && "border-slate-200 bg-white text-slate-400",
            )}
          >
            <span
              className={cn(
                "flex size-4 items-center justify-center rounded-full text-[10px]",
                isCurrent && "bg-[#09bc8a] text-white",
                isDone && !isCurrent && "bg-emerald-100 text-emerald-700",
                !isCurrent && !isDone && "bg-slate-100 text-slate-400",
              )}
            >
              {isDone && !isCurrent ? <Check className="size-2.5" aria-hidden /> : stepNum}
            </span>
            <span className="max-w-[7rem] truncate sm:max-w-none">{item.title}</span>
          </span>
        );
      })}
    </div>
  );

  const panelShell = cn(
    WIZARD_CARD_SHELL,
    "bg-gradient-to-b from-white to-slate-50/80",
    compact ? "p-4 sm:p-5 lg:hidden" : "hidden p-5 lg:block lg:sticky lg:top-24 lg:self-start",
  );

  return (
    <aside className={cn("w-full min-w-0", panelShell)} aria-label="Progresso do cadastro">
      <div className="flex items-center gap-2 text-[#0c1b33]">
        <span className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#09bc8a]/15 to-[#0c1b33]/5 text-[#09bc8a]">
          <Sparkles className="size-4" aria-hidden />
        </span>
        <h2 className="text-base font-bold tracking-tight">Cadastro do produto</h2>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Preencha uma etapa por vez e revise antes de publicar.
      </p>
      {showDraftHint && !compact ? (
        <p className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2 text-xs text-slate-600">
          <Cloud className="size-3.5 shrink-0 text-emerald-600" aria-hidden />
          Rascunho salvo neste dispositivo.
        </p>
      ) : null}

      {compact ? (
        <>
          <div className="mt-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                Etapa {step} de {totalSteps}
              </p>
              <p className="mt-1 text-sm font-semibold text-[#0c1b33]">{currentStepMeta.title}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="h-auto shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
              aria-expanded={stepsOpen}
              onClick={() => setStepsOpen((open) => !open)}
            >
              {stepsOpen ? "Ocultar" : "Etapas"}
            </Button>
          </div>
          {progressBar}
          {renderMobileStepPills()}
          {stepsOpen ? renderStepList("mt-4 border-t border-slate-100/80 pt-4") : null}
        </>
      ) : (
        <>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Etapa {step} de {totalSteps}
          </p>
          {progressBar}
          {renderStepList("mt-4")}
        </>
      )}
    </aside>
  );
}

function WizardFormCard({
  step,
  totalSteps,
  meta,
  stepError,
  submitError,
  showSubmitError,
  fieldDisabled,
  submitting,
  onCancel,
  onBack,
  onNext,
  onSubmit,
  showBack,
  isLastStep,
  children,
}: {
  step: number;
  totalSteps: number;
  meta: (typeof STEP_META)[number];
  stepError: string | null;
  submitError: string | null;
  showSubmitError: boolean;
  fieldDisabled: boolean;
  submitting: boolean;
  onCancel: () => void;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
  showBack: boolean;
  isLastStep: boolean;
  children: ReactNode;
}) {
  return (
    <div className={WIZARD_CARD_SHELL}>
      <div
        className="h-1 bg-slate-100/80"
        aria-hidden
      >
        <div
          className="h-full bg-gradient-to-r from-[#09bc8a] via-emerald-500 to-[#0c1b33]/80 transition-all duration-500 ease-out"
          style={{ width: `${(step / totalSteps) * 100}%` }}
        />
      </div>

      <div className="relative border-b border-slate-100/90 bg-gradient-to-br from-slate-50/90 via-white to-emerald-50/25 px-4 py-6 sm:px-8 sm:py-7">
        <p className="inline-flex items-center rounded-full border border-emerald-200/80 bg-emerald-50/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-800 lg:hidden">
          Etapa {step} de {totalSteps}
        </p>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-[#0c1b33] sm:text-[1.65rem]">
          {meta.title}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">{meta.description}</p>
        {meta.stepHint ? (
          <p className="mt-2 hidden text-xs text-slate-500 sm:block">{meta.stepHint}</p>
        ) : null}
      </div>

      <div className="w-full min-w-0 space-y-5 px-4 py-6 sm:space-y-6 sm:px-8 sm:py-8">
        {stepError ? (
          <p
            className="rounded-2xl border border-amber-200/90 bg-amber-50/90 px-4 py-3.5 text-sm text-amber-950 shadow-sm"
            role="alert"
          >
            {stepError}
          </p>
        ) : null}
        {showSubmitError && submitError ? (
          <p
            className="rounded-2xl border border-red-200/90 bg-red-50/90 px-4 py-3.5 text-sm text-red-900 shadow-sm"
            role="alert"
          >
            {submitError}
          </p>
        ) : null}
        {children}
      </div>

      <footer className="flex w-full min-w-0 flex-col gap-3 border-t border-slate-100/90 bg-slate-50/60 px-4 py-5 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-6">
        <div className="order-3 flex items-center sm:order-1">
          <Button
            type="button"
            variant="ghost"
            className={WIZARD_CANCEL_BTN}
            disabled={submitting}
            onClick={onCancel}
            aria-label="Cancelar cadastro"
          >
            Cancelar
          </Button>
        </div>
        <div className="order-1 flex min-w-0 flex-col-reverse gap-3 sm:order-2 sm:flex-row sm:items-center sm:justify-end">
          {showBack ? (
            <Button
              type="button"
              variant="ghost"
              className={WIZARD_BACK_BTN}
              disabled={submitting}
              onClick={onBack}
            >
              <ArrowLeft className="size-4 shrink-0" aria-hidden />
              Voltar
            </Button>
          ) : null}
          {!isLastStep ? (
            <Button
              type="button"
              className={WIZARD_PRIMARY_BTN}
              disabled={fieldDisabled}
              onClick={onNext}
            >
              Continuar
              <ArrowRight className="size-4 shrink-0" aria-hidden />
            </Button>
          ) : (
            <Button
              type="button"
              className={WIZARD_PRIMARY_BTN}
              disabled={fieldDisabled}
              onClick={onSubmit}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                  Cadastrando…
                </>
              ) : (
                "Cadastrar produto"
              )}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}

export function VenderProdutoCreateWizard(props: VenderProdutoCreateWizardProps) {
  const navigate = useNavigate();
  const create = useVenderProdutoCreate(props);
  const [step, setStep] = useState(1);
  const [stepError, setStepError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [stepRestored, setStepRestored] = useState(false);

  useEffect(() => {
    create.setDraftWizardStep(step);
  }, [create.setDraftWizardStep, step]);

  useEffect(() => {
    if (stepRestored || create.initialWizardStep == null) return;
    setStep(create.initialWizardStep);
    setStepRestored(true);
  }, [create.initialWizardStep, stepRestored]);

  const fieldDisabled = create.fieldDisabled;
  const meta = STEP_META[step - 1];

  const catalogPatch = useCallback(
    (partial: Parameters<typeof create.patchDraft>[0]) => {
      create.patchDraft(partial);
      if (step === 2) setStepError(null);
    },
    [create.patchDraft, step],
  );

  const validateCurrentStep = () => validateCreateWizardStep(step, create.fields);

  const handleNext = () => {
    const err = validateCurrentStep();
    if (err) {
      setStepError(err);
      toast.error(err);
      return;
    }
    setStepError(null);
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  };

  const handleBack = () => {
    setStepError(null);
    setStep((s) => Math.max(1, s - 1));
  };

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const handleCancel = () => setCancelDialogOpen(true);

  const handleDiscardDraftAndExit = () => {
    create.clearProductDraft();
    navigate(create.cancelHref);
    setCancelDialogOpen(false);
  };

  const handleSubmit = async () => {
    if (fieldDisabled) return;
    const err = validateCreateWizardStep(TOTAL_STEPS, create.fields);
    if (err) {
      setStepError(err);
      toast.error(err);
      return;
    }
    setSubmitError(null);
    const ok = await create.submitCreate();
    if (!ok) {
      setSubmitError("Não foi possível cadastrar o produto. Revise os dados e tente novamente.");
    }
  };

  if (create.catalogLoading) {
    return (
      <div
        className={cn("mx-auto w-full max-w-7xl", WIZARD_CARD_SHELL, "p-12")}
        role="status"
        aria-busy="true"
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="size-10 animate-spin text-[#09bc8a]" aria-hidden />
          <p className="text-sm font-medium text-slate-600">Carregando catálogos…</p>
        </div>
      </div>
    );
  }

  if (create.catalogError) {
    return (
      <Card className="mx-auto w-full max-w-7xl border-destructive/30 bg-destructive/5 shadow-lg" role="alert">
        <CardHeader>
          <CardTitle>Não foi possível preparar o cadastro</CardTitle>
          <CardDescription>Tente novamente em instantes.</CardDescription>
          {create.catalogError ? (
            <p className="pt-2 text-sm text-muted-foreground">{create.catalogError}</p>
          ) : null}
        </CardHeader>
        <CardFooter className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => void create.reloadCatalog()}>
            Tentar novamente
          </Button>
          <Button type="button" variant="outline" className={venderProdutoSecondaryButtonClass} asChild>
            <Link to={paths.venderAnunciar()}>Voltar para escolha de categoria</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <>
      <ConfirmDiscardDraftDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        onDiscard={handleDiscardDraftAndExit}
      />
      <div className="product-create-form grid w-full min-w-0 max-w-full gap-5 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] lg:items-start lg:gap-8 xl:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
      <WizardProgressPanel
        step={step}
        totalSteps={TOTAL_STEPS}
        showDraftHint={Boolean(create.draftKey)}
      />
      <div className="flex min-w-0 w-full flex-col gap-4 lg:gap-5">
        {create.draftKey ? (
          <p
            className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-2.5 text-xs text-slate-600 shadow-sm backdrop-blur-sm lg:hidden"
            role="status"
          >
            <Cloud className="size-3.5 shrink-0 text-emerald-600" aria-hidden />
            Rascunho salvo automaticamente neste dispositivo.
          </p>
        ) : null}
        <WizardProgressPanel step={step} totalSteps={TOTAL_STEPS} compact />
        <WizardFormCard
          step={step}
          totalSteps={TOTAL_STEPS}
          meta={meta}
          stepError={stepError}
          submitError={submitError}
          showSubmitError={step === TOTAL_STEPS}
          fieldDisabled={fieldDisabled}
          submitting={create.submitting}
          onCancel={handleCancel}
          onBack={handleBack}
          onNext={handleNext}
          onSubmit={() => void handleSubmit()}
          showBack={step > 1}
          isLastStep={step >= TOTAL_STEPS}
        >
          <WizardStepPanel active={step === 1}>
            <CreateStepPrincipais {...create.catalogProps} />
          </WizardStepPanel>
          <WizardStepPanel active={step === 2}>
            <CreateStepCategoriaMarca
              {...create.catalogProps}
              patch={catalogPatch}
              categoryLocked={create.categoryLocked}
              stepError={stepError}
            />
          </WizardStepPanel>
          <WizardStepPanel active={step === 3}>
            <CreateStepPrecoEstoque
              draft={create.catalogProps.draft}
              patch={create.catalogProps.patch}
              disabled={fieldDisabled}
              estoqueInicial={create.fields.estoqueInicial}
              onEstoqueChange={create.setEstoqueInicial}
            />
          </WizardStepPanel>
          <WizardStepPanel active={step === 4}>
            <div className="space-y-4">
              {create.draftImagesNotice ? (
                <p
                  className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
                  role="status"
                >
                  As imagens do rascunho não foram recuperadas após atualizar a página. Selecione
                  as fotos novamente.
                </p>
              ) : null}
              <CreateStepImagens {...create.imageProps} />
            </div>
          </WizardStepPanel>
          <WizardStepPanel active={step === 5}>
            <CreateStepCaracteristicas {...create.indexadorProps} />
          </WizardStepPanel>
          <WizardStepPanel active={step === 6}>
            <CreateStepOpcionais {...create.catalogProps} />
          </WizardStepPanel>
          <WizardStepPanel active={step === 7}>
            <CreateStepRevisao
              {...create.catalogProps}
              estoqueInicial={create.fields.estoqueInicial}
              images={create.imageProps.images}
              principalId={create.imageProps.principalId}
              requiredFieldValues={create.fields.requiredFieldValues}
              categoriaSlug={create.fields.categoriaSlug}
              indexadorRows={create.fields.indexadorRows}
              condicao={create.fields.condicao}
              ativo={create.fields.ativo}
              onGoToStep={(targetStep) => {
                setStepError(null);
                setStep(targetStep);
              }}
            />
          </WizardStepPanel>
        </WizardFormCard>
      </div>
    </div>
    </>
  );
}
