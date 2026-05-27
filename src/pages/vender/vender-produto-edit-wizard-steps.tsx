import { forwardRef, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { categoriasRoutes, marcasRoutes } from "@/api/endpoints";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAxiosErrorMessage } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import type { CategoriaPai, Subcategoria } from "@/types/categoria";
import type { Marca } from "@/types/marca";
import {
  formatProdutoCondicaoLabel,
  isProdutoCondicao,
  PRODUTO_CONDICAO_OPTIONS,
} from "@/types/produto";
import type { ProdutoImagemView } from "@/types/produto";
import {
  INPUT_CLASS,
  SELECT_TRIGGER_CLASS,
} from "@/pages/vender/vender-produto-create-form";
import {
  ProdutoImagesEditPanel,
  ProdutoImagesReviewGrid,
  type ProdutoImagesEditPanelHandle,
} from "@/pages/vender/vender-produto-images-manager";
import {
  ReviewBadge,
  ReviewDescriptionBlock,
  ReviewDetail,
  ReviewFieldGrid,
  ReviewIntroBanner,
  ReviewPriceBlock,
  ReviewSectionCard,
  useReviewSections,
} from "@/pages/vender/vender-produto-review-ui";
import {
  SUB_USAR_PAI,
  parseMoneyBr,
  type ProdutoSellerEditorDraft,
} from "@/pages/vender/vender-produto-editor-utils";

const PAI_SENTINEL = "__sem_pai__";
const MARCA_PLACEHOLDER = "__placeholder__";

export type WizardCatalogProps = {
  draft: ProdutoSellerEditorDraft;
  patch: (partial: Partial<ProdutoSellerEditorDraft>) => void;
  disabled: boolean;
  categoriasPai: CategoriaPai[];
  subcategorias: Subcategoria[];
  marcas: Marca[];
  marcaAtual: Marca | null;
  setMarcaAtual: (m: Marca | null) => void;
  subsLoading: boolean;
  loadMarcas: () => Promise<Marca[]>;
};

export function WizardStepPrincipais({ draft, patch, disabled }: WizardCatalogProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="wiz-titulo">Título</Label>
        <Input
          id="wiz-titulo"
          value={draft.titulo}
          onChange={(e) => patch({ titulo: e.target.value })}
          disabled={disabled}
          className={INPUT_CLASS}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="wiz-descricao">Descrição</Label>
        <textarea
          id="wiz-descricao"
          value={draft.descricao}
          onChange={(e) => patch({ descricao: e.target.value })}
          disabled={disabled}
          rows={8}
          className={cn(INPUT_CLASS, "min-h-[160px] resize-y py-3")}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="wiz-condicao">Condição</Label>
        <Select
          value={draft.condicao}
          onValueChange={(v) => {
            if (isProdutoCondicao(v)) patch({ condicao: v });
          }}
          disabled={disabled}
        >
          <SelectTrigger id="wiz-condicao" className={cn(SELECT_TRIGGER_CLASS)}>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {PRODUTO_CONDICAO_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3">
        <Checkbox
          id="wiz-ativo"
          checked={draft.ativo}
          onCheckedChange={(c) => patch({ ativo: c === true })}
          disabled={disabled}
        />
        <Label htmlFor="wiz-ativo" className="text-sm font-medium text-slate-800">
          Produto ativo na vitrine
        </Label>
      </div>
    </div>
  );
}

export function WizardStepCategoriaMarca({
  draft,
  patch,
  disabled,
  categoriasPai,
  subcategorias,
  marcas,
  marcaAtual,
  setMarcaAtual,
  subsLoading,
  loadMarcas,
}: WizardCatalogProps) {
  const [showCreateSub, setShowCreateSub] = useState(false);
  const [newSubNome, setNewSubNome] = useState("");
  const [newSubSlug, setNewSubSlug] = useState("");
  const [creatingSub, setCreatingSub] = useState(false);
  const [subFormError, setSubFormError] = useState<string | null>(null);
  const [showMarcaForm, setShowMarcaForm] = useState(false);
  const [newMarcaNome, setNewMarcaNome] = useState("");
  const [newMarcaSlug, setNewMarcaSlug] = useState("");
  const [newMarcaDescricao, setNewMarcaDescricao] = useState("");
  const [newMarcaLogo, setNewMarcaLogo] = useState<File | null>(null);
  const [creatingMarca, setCreatingMarca] = useState(false);
  const [marcaFormError, setMarcaFormError] = useState<string | null>(null);

  const marcaNaLista = draft.marcaId
    ? marcas.some((m) => String(m.id) === draft.marcaId)
    : false;
  const marcaAtualNoSelect =
    draft.marcaId &&
    marcaAtual &&
    String(marcaAtual.id) === draft.marcaId &&
    !marcaNaLista;
  const marcaSelectValue =
    draft.marcaId && (marcaNaLista || marcaAtualNoSelect) ? draft.marcaId : MARCA_PLACEHOLDER;

  const resetSubCreateForm = () => {
    setNewSubNome("");
    setNewSubSlug("");
    setSubFormError(null);
  };

  const closeSubCreateForm = () => {
    setShowCreateSub(false);
    resetSubCreateForm();
  };

  const handleCreateSub = async () => {
    if (!draft.categoriaPaiId) {
      setSubFormError("Selecione a categoria principal.");
      return;
    }
    const nome = newSubNome.trim();
    if (!nome) {
      setSubFormError("Informe o nome da subcategoria.");
      return;
    }
    setCreatingSub(true);
    setSubFormError(null);
    try {
      const payload: { categoria_pai_id: number; nome: string; slug?: string } = {
        categoria_pai_id: Number.parseInt(draft.categoriaPaiId, 10),
        nome,
      };
      const sSlug = newSubSlug.trim();
      if (sSlug) payload.slug = sSlug;
      const created = await categoriasRoutes.createSubcategoria(payload);
      patch({ subcategoriaId: String(created.id) });
      closeSubCreateForm();
      toast.success("Subcategoria criada.");
    } catch (err) {
      const msg = getAxiosErrorMessage(err, "Não foi possível criar a subcategoria.");
      setSubFormError(msg);
      toast.error(msg);
    } finally {
      setCreatingSub(false);
    }
  };

  const handleCreateMarca = async () => {
    const nome = newMarcaNome.trim();
    const slugM = newMarcaSlug.trim();
    const descricaoM = newMarcaDescricao.trim();
    if (!nome || !slugM || !descricaoM || !newMarcaLogo) {
      setMarcaFormError("Preencha nome, slug, descrição e logo.");
      return;
    }
    setCreatingMarca(true);
    setMarcaFormError(null);
    try {
      const created = await marcasRoutes.createMarca({
        meta: { nome, slug: slugM, descricao: descricaoM, ativo: true },
        logo: newMarcaLogo,
      });
      await loadMarcas();
      patch({ marcaId: String(created.id) });
      setMarcaAtual(created);
      setShowMarcaForm(false);
      toast.success("Marca criada e selecionada.");
    } catch (err) {
      setMarcaFormError(getAxiosErrorMessage(err, "Não foi possível criar a marca."));
    } finally {
      setCreatingMarca(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="wiz-cat-pai">Categoria principal</Label>
        <Select
          value={draft.categoriaPaiId || PAI_SENTINEL}
          onValueChange={(v) =>
            patch({
              categoriaPaiId: v === PAI_SENTINEL ? "" : v,
              subcategoriaId: SUB_USAR_PAI,
            })
          }
          disabled={disabled}
        >
          <SelectTrigger id="wiz-cat-pai" className={cn(SELECT_TRIGGER_CLASS)}>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={PAI_SENTINEL}>Selecione…</SelectItem>
            {categoriasPai.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="wiz-sub">Subcategoria</Label>
        <Select
          value={
            draft.subcategoriaId && draft.subcategoriaId !== SUB_USAR_PAI
              ? draft.subcategoriaId
              : SUB_USAR_PAI
          }
          onValueChange={(v) => patch({ subcategoriaId: v === SUB_USAR_PAI ? SUB_USAR_PAI : v })}
          disabled={disabled || !draft.categoriaPaiId || subsLoading}
        >
          <SelectTrigger id="wiz-sub" className={cn(SELECT_TRIGGER_CLASS)}>
            <SelectValue placeholder={subsLoading ? "Carregando…" : "Usar categoria principal"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SUB_USAR_PAI}>Usar apenas a categoria principal</SelectItem>
            {subcategorias.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                {s.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-full min-w-0">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full text-slate-700 sm:w-auto"
          disabled={disabled || !draft.categoriaPaiId}
          onClick={() => {
            if (showCreateSub) closeSubCreateForm();
            else {
              setShowCreateSub(true);
              setSubFormError(null);
            }
          }}
        >
          {!showCreateSub ? <Plus className="mr-2 size-4" aria-hidden /> : null}
          {showCreateSub ? "Fechar" : "Criar nova subcategoria"}
        </Button>
        {!draft.categoriaPaiId ? (
          <p className="mt-2 text-xs text-slate-500">
            Selecione uma categoria principal antes de criar uma subcategoria.
          </p>
        ) : null}
      </div>

      {showCreateSub && draft.categoriaPaiId ? (
        <div className="rounded-2xl border border-dashed border-emerald-200/80 bg-emerald-50/30 p-4 sm:p-5">
          <p className="text-sm font-semibold text-slate-900">Nova subcategoria</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-1">
              <Label htmlFor="edit-new-sub-nome" className="text-xs font-medium text-slate-700">
                Nome
              </Label>
              <Input
                id="edit-new-sub-nome"
                value={newSubNome}
                onChange={(e) => {
                  setNewSubNome(e.target.value);
                  setSubFormError(null);
                }}
                disabled={disabled || creatingSub}
                placeholder="Nome"
                className={INPUT_CLASS}
              />
            </div>
            <div className="space-y-2 sm:col-span-1">
              <Label htmlFor="edit-new-sub-slug" className="text-xs font-medium text-slate-700">
                Slug (opcional)
              </Label>
              <Input
                id="edit-new-sub-slug"
                value={newSubSlug}
                onChange={(e) => {
                  setNewSubSlug(e.target.value);
                  setSubFormError(null);
                }}
                disabled={disabled || creatingSub}
                placeholder="Slug (opcional)"
                className={INPUT_CLASS}
              />
            </div>
          </div>
          {subFormError ? (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {subFormError}
            </p>
          ) : null}
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              disabled={creatingSub}
              onClick={closeSubCreateForm}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              className="w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto"
              disabled={disabled || creatingSub}
              onClick={() => void handleCreateSub()}
            >
              {creatingSub ? (
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
              ) : (
                <Plus className="mr-2 size-4" aria-hidden />
              )}
              Criar subcategoria
            </Button>
          </div>
        </div>
      ) : null}

      <div className="space-y-2 border-t border-slate-100 pt-5">
        <Label htmlFor="wiz-marca">Marca</Label>
        <Select
          value={marcaSelectValue}
          onValueChange={(v) => {
            patch({ marcaId: v === MARCA_PLACEHOLDER ? "" : v });
            if (v !== MARCA_PLACEHOLDER) {
              setMarcaAtual(marcas.find((m) => String(m.id) === v) ?? marcaAtual);
            }
          }}
          disabled={disabled}
        >
          <SelectTrigger id="wiz-marca" className={cn(SELECT_TRIGGER_CLASS)}>
            <SelectValue placeholder="Selecione uma marca" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={MARCA_PLACEHOLDER} disabled>
              Selecione uma marca
            </SelectItem>
            {marcaAtualNoSelect && marcaAtual ? (
              <SelectItem value={String(marcaAtual.id)}>{marcaAtual.nome} (inativa)</SelectItem>
            ) : null}
            {marcas.map((m) => (
              <SelectItem key={m.id} value={String(m.id)}>
                {m.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {marcaAtualNoSelect && marcaAtual ? (
          <p className="text-sm text-amber-800">Marca atual: {marcaAtual.nome} (inativa)</p>
        ) : null}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => setShowMarcaForm((v) => !v)}
      >
        {showMarcaForm ? "Fechar cadastro de marca" : "Cadastrar nova marca"}
      </Button>
      {showMarcaForm ? (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
          <Input
            value={newMarcaNome}
            onChange={(e) => setNewMarcaNome(e.target.value)}
            placeholder="Nome"
            className={INPUT_CLASS}
          />
          <Input
            value={newMarcaSlug}
            onChange={(e) => setNewMarcaSlug(e.target.value)}
            placeholder="Slug"
            className={INPUT_CLASS}
          />
          <textarea
            value={newMarcaDescricao}
            onChange={(e) => setNewMarcaDescricao(e.target.value)}
            rows={2}
            placeholder="Descrição"
            className={cn(INPUT_CLASS, "resize-y py-2")}
          />
          <Input
            type="file"
            accept="image/*"
            className={cn(INPUT_CLASS, "h-auto py-2")}
            onChange={(e) => setNewMarcaLogo(e.target.files?.[0] ?? null)}
          />
          {marcaFormError ? (
            <p className="text-sm text-destructive" role="alert">
              {marcaFormError}
            </p>
          ) : null}
          <Button type="button" size="sm" disabled={creatingMarca} onClick={() => void handleCreateMarca()}>
            {creatingMarca ? "Criando…" : "Criar marca"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function WizardStepPreco({ draft, patch, disabled }: WizardCatalogProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="wiz-preco">Preço (R$)</Label>
        <Input
          id="wiz-preco"
          inputMode="decimal"
          value={draft.preco}
          onChange={(e) => patch({ preco: e.target.value })}
          disabled={disabled}
          placeholder="ex.: 1299,90"
          className={INPUT_CLASS}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="wiz-promo">Preço promocional (opcional)</Label>
        <Input
          id="wiz-promo"
          inputMode="decimal"
          value={draft.preco_promocional}
          onChange={(e) => patch({ preco_promocional: e.target.value })}
          disabled={disabled}
          className={INPUT_CLASS}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="wiz-sku">SKU (opcional)</Label>
        <Input
          id="wiz-sku"
          value={draft.sku}
          onChange={(e) => patch({ sku: e.target.value })}
          disabled={disabled}
          className={INPUT_CLASS}
        />
      </div>
    </div>
  );
}

type WizardStepImagensProps = {
  produtoId: string;
  imagens: ProdutoImagemView[];
  disabled?: boolean;
  onImagensChange?: (imagens: ProdutoImagemView[]) => void;
  onUploaded?: () => Promise<void>;
};

export const WizardStepImagens = forwardRef<
  ProdutoImagesEditPanelHandle,
  WizardStepImagensProps
>(function WizardStepImagens(
  { produtoId, imagens, disabled = false, onImagensChange, onUploaded },
  ref,
) {
  return (
    <ProdutoImagesEditPanel
      ref={ref}
      produtoId={produtoId}
      imagens={imagens}
      disabled={disabled}
      onImagensChange={onImagensChange}
      onUploaded={onUploaded}
      embedded
    />
  );
});

export function WizardStepMedidas({
  draft,
  patch,
  disabled,
  showSlug = true,
}: WizardCatalogProps & { showSlug?: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {showSlug ? (
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="wiz-slug">Slug (opcional)</Label>
          <Input
            id="wiz-slug"
            value={draft.slug}
            onChange={(e) => patch({ slug: e.target.value })}
            disabled={disabled}
            placeholder="Gerado a partir do título se vazio"
            className={INPUT_CLASS}
          />
        </div>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="wiz-peso">Peso (g)</Label>
        <Input
          id="wiz-peso"
          inputMode="numeric"
          value={draft.peso_gramas}
          onChange={(e) => patch({ peso_gramas: e.target.value })}
          disabled={disabled}
          className={INPUT_CLASS}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="wiz-alt">Altura (cm)</Label>
        <Input
          id="wiz-alt"
          inputMode="decimal"
          value={draft.altura_cm}
          onChange={(e) => patch({ altura_cm: e.target.value })}
          disabled={disabled}
          className={INPUT_CLASS}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="wiz-larg">Largura (cm)</Label>
        <Input
          id="wiz-larg"
          inputMode="decimal"
          value={draft.largura_cm}
          onChange={(e) => patch({ largura_cm: e.target.value })}
          disabled={disabled}
          className={INPUT_CLASS}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="wiz-comp">Comprimento (cm)</Label>
        <Input
          id="wiz-comp"
          inputMode="decimal"
          value={draft.comprimento_cm}
          onChange={(e) => patch({ comprimento_cm: e.target.value })}
          disabled={disabled}
          className={INPUT_CLASS}
        />
      </div>
    </div>
  );
}

function formatBrlDisplay(raw: string): string {
  const n = parseMoneyBr(raw);
  if (n == null) return raw.trim() || "—";
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
  } catch {
    return String(n);
  }
}

type EditReviewSectionId = "principais" | "categoria" | "preco" | "imagens" | "medidas";

function formatReviewMoney(raw: string): string {
  const formatted = formatBrlDisplay(raw);
  if (formatted === "—") return "Não informado";
  return formatted;
}

export function WizardStepRevisao({
  draft,
  categoriasPai,
  subcategorias,
  marcas,
  marcaAtual,
  imagensGaleria,
}: WizardCatalogProps & { imagensGaleria: ProdutoImagemView[] }) {
  const imagens = imagensGaleria.map((v) => v.url);
  const coverIndex = Math.max(0, imagensGaleria.findIndex((v) => v.principal));
  const { openSections, toggleSection } = useReviewSections<EditReviewSectionId>({
    principais: false,
    categoria: false,
    preco: false,
    imagens: false,
    medidas: false,
  });

  const condicaoLabel = formatProdutoCondicaoLabel(draft.condicao);
  const titulo = draft.titulo.trim();
  const descricao = draft.descricao.trim();

  const paiNome =
    categoriasPai.find((c) => String(c.id) === draft.categoriaPaiId)?.nome ?? null;
  const subNome =
    draft.subcategoriaId && draft.subcategoriaId !== SUB_USAR_PAI
      ? subcategorias.find((s) => String(s.id) === draft.subcategoriaId)?.nome ?? null
      : null;
  const marcaNome =
    marcas.find((m) => String(m.id) === draft.marcaId)?.nome ?? marcaAtual?.nome ?? null;

  const precoDisplay = formatReviewMoney(draft.preco);
  const promoDisplay = draft.preco_promocional.trim()
    ? formatReviewMoney(draft.preco_promocional)
    : "Não informado";

  const medidasSummary =
    [
      draft.peso_gramas.trim() ? `${draft.peso_gramas} g` : null,
      draft.altura_cm.trim() ? `${draft.altura_cm} cm alt.` : null,
      draft.largura_cm.trim() ? `${draft.largura_cm} cm larg.` : null,
      draft.comprimento_cm.trim() ? `${draft.comprimento_cm} cm comp.` : null,
    ]
      .filter(Boolean)
      .join(" · ") || "Nenhuma medida informada";

  return (
    <div className="w-full min-w-0 space-y-4">
      <ReviewIntroBanner
        title="Confira antes de salvar"
        description="Revise os dados alterados por seção antes de confirmar."
      />

      <ReviewSectionCard
        title="Dados principais"
        summary={titulo ? `${titulo} · ${condicaoLabel}` : "Dados principais incompletos"}
        open={openSections.principais}
        onToggle={() => toggleSection("principais")}
      >
        <ReviewDescriptionBlock text={descricao} />
        <ReviewFieldGrid>
          <ReviewDetail label="Título">{titulo || "Não informado"}</ReviewDetail>
          <ReviewDetail label="Publicação">
            <div className="flex flex-wrap gap-2">
              <ReviewBadge variant={draft.condicao === "novo" ? "success" : "neutral"}>
                {condicaoLabel}
              </ReviewBadge>
              <ReviewBadge variant={draft.ativo ? "success" : "warning"}>
                {draft.ativo ? "Ativo na vitrine" : "Inativo na vitrine"}
              </ReviewBadge>
            </div>
          </ReviewDetail>
        </ReviewFieldGrid>
      </ReviewSectionCard>

      <ReviewSectionCard
        title="Categoria e marca"
        summary={[paiNome, subNome, marcaNome].filter(Boolean).join(" · ") || "Não informado"}
        open={openSections.categoria}
        onToggle={() => toggleSection("categoria")}
      >
        <ReviewFieldGrid>
          <ReviewDetail label="Categoria principal">{paiNome ?? "Não informado"}</ReviewDetail>
          <ReviewDetail label="Subcategoria">{subNome ?? "Não informado"}</ReviewDetail>
          <div className="min-w-0 sm:col-span-2">
            <ReviewDetail label="Marca">{marcaNome ?? "Não informado"}</ReviewDetail>
          </div>
        </ReviewFieldGrid>
      </ReviewSectionCard>

      <ReviewSectionCard
        title="Preço e disponibilidade"
        summary={
          draft.preco_promocional.trim()
            ? `${precoDisplay} · promocional ${formatReviewMoney(draft.preco_promocional)}`
            : precoDisplay
        }
        open={openSections.preco}
        onToggle={() => toggleSection("preco")}
      >
        <ReviewFieldGrid>
          <ReviewPriceBlock precoLabel={precoDisplay} promoLabel={promoDisplay} />
          <ReviewDetail label="SKU">{draft.sku.trim() || "Não informado"}</ReviewDetail>
        </ReviewFieldGrid>
      </ReviewSectionCard>

      <ReviewSectionCard
        title="Imagens"
        summary={
          imagens.length > 0
            ? `${imagens.length} ${imagens.length === 1 ? "foto" : "fotos"} na galeria`
            : "Nenhuma foto publicada"
        }
        open={openSections.imagens}
        onToggle={() => toggleSection("imagens")}
      >
        <ProdutoImagesReviewGrid
          imagens={imagens}
          coverIndex={coverIndex}
          emptyMessage="Nenhuma foto publicada"
          emptyHint="Adicione fotos na etapa Fotografias."
        />
      </ReviewSectionCard>

      <ReviewSectionCard
        title="Medidas e dados opcionais"
        summary={medidasSummary}
        open={openSections.medidas}
        onToggle={() => toggleSection("medidas")}
      >
        <ReviewFieldGrid>
          <ReviewDetail label="Peso (g)">
            {draft.peso_gramas.trim() ? `${draft.peso_gramas.trim()} g` : "Não informado"}
          </ReviewDetail>
          <ReviewDetail label="Altura (cm)">
            {draft.altura_cm.trim() ? `${draft.altura_cm.trim()} cm` : "Não informado"}
          </ReviewDetail>
          <ReviewDetail label="Largura (cm)">
            {draft.largura_cm.trim() ? `${draft.largura_cm.trim()} cm` : "Não informado"}
          </ReviewDetail>
          <ReviewDetail label="Comprimento (cm)">
            {draft.comprimento_cm.trim() ? `${draft.comprimento_cm.trim()} cm` : "Não informado"}
          </ReviewDetail>
          <div className="min-w-0 sm:col-span-2">
            <ReviewDetail label="Slug (URL)">
              {draft.slug.trim() || "Não definido"}
            </ReviewDetail>
          </div>
        </ReviewFieldGrid>
      </ReviewSectionCard>
    </div>
  );
}


