import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  FolderTree,
  ImagePlus,
  ListChecks,
  Loader2,
  Package,
  Plus,
  Tag,
} from "lucide-react";
import { toast } from "sonner";

import { categoriasRoutes, marcasRoutes } from "@/api/endpoints";
import { getProdutoById, updateProduto } from "@/api/endpoints/produtos.routes";
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
import {
  isProdutoCondicao,
  PRODUTO_CONDICAO_OPTIONS,
} from "@/types/produto";
import { notifySuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { CategoriaPai, Subcategoria } from "@/types/categoria";
import type { Marca } from "@/types/marca";
import {
  extractProdutoImagensViews,
  normalizeProdutoDetalhe,
  type ProdutoDetalheView,
  type ProdutoImagemView,
} from "@/types/produto";
import {
  ProdutoImagesEditPanel,
  type ProdutoImagesEditPanelHandle,
} from "@/pages/vender/vender-produto-images-manager";
import {
  INPUT_CLASS,
  SELECT_TRIGGER_CLASS,
} from "@/pages/vender/vender-produto-create-form";
import {
  SUB_USAR_PAI,
  buildEditorDraft,
  buildUpdatePayloadFromDraft,
  enrichMarcaNaResolucao,
  resolveProdutoCategoriaMarca,
  validateEditorDraft,
  venderProdutoSecondaryButtonClass,
  type ProdutoSellerEditorDraft,
} from "@/pages/vender/vender-produto-editor-utils";

const PAI_SENTINEL = "__sem_pai__";
const MARCA_PLACEHOLDER = "__placeholder__";

function FormSection({
  title,
  description,
  children,
  icon: Icon,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <section className="w-full min-w-0 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
      <header className="mb-5 flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          {Icon ? (
            <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-700 ring-1 ring-emerald-100/80">
              <Icon className="size-[18px]" aria-hidden />
            </span>
          ) : null}
          <div className="min-w-0 space-y-1">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
            {description ? (
              <p className="text-sm leading-relaxed text-slate-600">{description}</p>
            ) : null}
          </div>
        </div>
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function EmBreveCard({ titulo }: { titulo: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-center">
      <p className="text-sm font-semibold text-slate-800">{titulo}</p>
      <p className="mt-2 text-sm text-slate-600">Em breve — edição disponível em uma próxima etapa.</p>
    </div>
  );
}

type Props = {
  produtoId: string;
  produto: ProdutoDetalheView;
  rawPayload: unknown;
  previewHref: string;
};

export function VenderProdutoEditForm({
  produtoId,
  produto,
  rawPayload,
  previewHref,
}: Props) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<ProdutoSellerEditorDraft>(() =>
    buildEditorDraft(produto, rawPayload),
  );
  const [categoriasPai, setCategoriasPai] = useState<CategoriaPai[]>([]);
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [marcaAtual, setMarcaAtual] = useState<Marca | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [subsLoading, setSubsLoading] = useState(false);
  const [newSubNome, setNewSubNome] = useState("");
  const [newSubSlug, setNewSubSlug] = useState("");
  const [creatingSub, setCreatingSub] = useState(false);
  const [showMarcaForm, setShowMarcaForm] = useState(false);
  const [newMarcaNome, setNewMarcaNome] = useState("");
  const [newMarcaSlug, setNewMarcaSlug] = useState("");
  const [newMarcaDescricao, setNewMarcaDescricao] = useState("");
  const [newMarcaLogo, setNewMarcaLogo] = useState<File | null>(null);
  const [creatingMarca, setCreatingMarca] = useState(false);
  const [marcaFormError, setMarcaFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const imagesPanelRef = useRef<ProdutoImagesEditPanelHandle>(null);
  const [imagensGaleria, setImagensGaleria] = useState<ProdutoImagemView[]>(
    () => produto.imagensGaleria,
  );

  useEffect(() => {
    setImagensGaleria(produto.imagensGaleria);
  }, [produto.imagensGaleria]);

  const patch = (partial: Partial<ProdutoSellerEditorDraft>) => {
    setDraft((d) => ({ ...d, ...partial }));
    setSaveError(null);
  };

  const loadMarcas = useCallback(async () => {
    const list = await marcasRoutes.getMarcas();
    setMarcas(list);
    return list;
  }, []);

  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);
    setCatalogError(null);
    void (async () => {
      try {
        const [paiList, marcasList, allSubs] = await Promise.all([
          categoriasRoutes.getCategoriasPai(),
          marcasRoutes.getMarcas(),
          categoriasRoutes.getMinhasSubcategorias(),
        ]);
        if (cancelled) return;
        setCategoriasPai(paiList);
        setMarcas(marcasList);

        const baseResolved = resolveProdutoCategoriaMarca(
          rawPayload,
          paiList,
          allSubs,
          marcasList,
        );
        const resolved = await enrichMarcaNaResolucao(baseResolved, rawPayload, marcasList);
        if (cancelled) return;
        setMarcaAtual(resolved.marcaAtual);
        setDraft((d) => ({
          ...d,
          categoriaPaiId: resolved.categoriaPaiId,
          subcategoriaId: resolved.subcategoriaId,
          marcaId: resolved.marcaId || d.marcaId,
        }));

        if (resolved.categoriaPaiId) {
          const subs = await categoriasRoutes.getMinhasSubcategorias({
            categoria_pai_id: Number.parseInt(resolved.categoriaPaiId, 10),
          });
          if (!cancelled) setSubcategorias(subs);
        }
      } catch (e) {
        if (!cancelled) {
          setCatalogError(getAxiosErrorMessage(e, "Não foi possível carregar catálogos."));
        }
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rawPayload]);

  useEffect(() => {
    if (catalogLoading) return;
    if (!draft.categoriaPaiId) {
      setSubcategorias([]);
      return;
    }
    const paiNum = Number.parseInt(draft.categoriaPaiId, 10);
    if (!Number.isFinite(paiNum)) return;
    let cancelled = false;
    setSubsLoading(true);
    void categoriasRoutes
      .getMinhasSubcategorias({ categoria_pai_id: paiNum })
      .then((subs) => {
        if (!cancelled) setSubcategorias(subs);
      })
      .catch(() => {
        if (!cancelled) setSubcategorias([]);
      })
      .finally(() => {
        if (!cancelled) setSubsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [catalogLoading, draft.categoriaPaiId]);

  const fieldDisabled = submitting || catalogLoading;

  const handleCreateSubcategoria = async () => {
    if (!draft.categoriaPaiId) {
      toast.error("Selecione a categoria principal antes de criar uma subcategoria.");
      return;
    }
    const nome = newSubNome.trim();
    if (!nome) {
      toast.error("Informe o nome da subcategoria.");
      return;
    }
    const paiNum = Number.parseInt(draft.categoriaPaiId, 10);
    setCreatingSub(true);
    try {
      const payload: { categoria_pai_id: number; nome: string; slug?: string } = {
        categoria_pai_id: paiNum,
        nome,
      };
      const sSlug = newSubSlug.trim();
      if (sSlug) payload.slug = sSlug;
      const created = await categoriasRoutes.createSubcategoria(payload);
      setSubcategorias((prev) =>
        [...prev, created].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
      );
      patch({ subcategoriaId: String(created.id) });
      setNewSubNome("");
      setNewSubSlug("");
      toast.success("Subcategoria criada.");
    } catch (err) {
      toast.error(getAxiosErrorMessage(err, "Não foi possível criar a subcategoria."));
    } finally {
      setCreatingSub(false);
    }
  };

  const handleCreateMarca = async () => {
    const nome = newMarcaNome.trim();
    const slugM = newMarcaSlug.trim();
    const descricaoM = newMarcaDescricao.trim();
    if (!nome || !slugM || !descricaoM || !newMarcaLogo) {
      setMarcaFormError("Preencha nome, slug, descrição e logo da marca.");
      return;
    }
    if (!/^[-a-z0-9]+$/i.test(slugM)) {
      setMarcaFormError("Slug inválido: use letras, números e hífens.");
      return;
    }
    setCreatingMarca(true);
    setMarcaFormError(null);
    try {
      const created = await marcasRoutes.createMarca({
        meta: {
          nome,
          slug: slugM,
          descricao: descricaoM,
          ativo: true,
        },
        logo: newMarcaLogo,
      });
      await loadMarcas();
      patch({ marcaId: String(created.id) });
      setMarcaAtual(created);
      setShowMarcaForm(false);
      setNewMarcaNome("");
      setNewMarcaSlug("");
      setNewMarcaDescricao("");
      setNewMarcaLogo(null);
      toast.success("Marca criada e selecionada.");
    } catch (err) {
      setMarcaFormError(getAxiosErrorMessage(err, "Não foi possível criar a marca."));
    } finally {
      setCreatingMarca(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (fieldDisabled) return;

    const validation = validateEditorDraft(draft);
    if (validation) {
      toast.error(validation);
      return;
    }

    const payload = buildUpdatePayloadFromDraft(draft);
    if (!payload) {
      toast.error("Revise os campos antes de salvar.");
      return;
    }

    setSubmitting(true);
    setSaveError(null);
    try {
      const uploaded = (await imagesPanelRef.current?.publishPendingImages()) ?? true;
      if (!uploaded) return;

      await updateProduto(produtoId, payload);
      notifySuccess("Alterações salvas", "O produto foi atualizado com sucesso.");
      navigate(previewHref, { replace: false });
    } catch (err) {
      const msg = getAxiosErrorMessage(err, "Não foi possível salvar as alterações.");
      setSaveError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

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

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="mx-auto w-full pb-6" aria-busy={submitting}>
      {catalogError ? (
        <div
          role="alert"
          className="mb-6 rounded-2xl border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-900"
        >
          {catalogError}
        </div>
      ) : null}

      {saveError ? (
        <div
          role="alert"
          className="mb-6 rounded-2xl border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-900"
        >
          {saveError}
        </div>
      ) : null}

      <div className="flex flex-col gap-6">
        <FormSection
          icon={Package}
          title="Dados principais"
          description="Título, preço e descrição exibidos na página do produto."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="edit-titulo">Título</Label>
              <Input
                id="edit-titulo"
                value={draft.titulo}
                onChange={(e) => patch({ titulo: e.target.value })}
                disabled={fieldDisabled}
                className={INPUT_CLASS}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-preco">Preço (R$)</Label>
              <Input
                id="edit-preco"
                inputMode="decimal"
                value={draft.preco}
                onChange={(e) => patch({ preco: e.target.value })}
                disabled={fieldDisabled}
                className={INPUT_CLASS}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-condicao">Condição</Label>
              <Select
                value={draft.condicao}
                onValueChange={(v) => {
                  if (isProdutoCondicao(v)) patch({ condicao: v });
                }}
                disabled={fieldDisabled}
              >
                <SelectTrigger id="edit-condicao" className={cn(SELECT_TRIGGER_CLASS)}>
                  <SelectValue />
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
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="edit-descricao">Descrição</Label>
              <textarea
                id="edit-descricao"
                value={draft.descricao}
                onChange={(e) => patch({ descricao: e.target.value })}
                disabled={fieldDisabled}
                rows={8}
                className={cn(INPUT_CLASS, "min-h-[180px] resize-y py-3")}
              />
            </div>
          </div>
        </FormSection>

        <FormSection
          icon={FolderTree}
          title="Categoria do anúncio"
          description="Escolha a categoria principal e, se quiser, uma subcategoria da sua loja."
        >
          {catalogLoading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Carregando categorias…
            </p>
          ) : (
          <>
          <div className="space-y-2">
            <Label htmlFor="edit-cat-pai">Categoria principal</Label>
            <Select
              value={draft.categoriaPaiId || PAI_SENTINEL}
              onValueChange={(v) =>
                patch({
                  categoriaPaiId: v === PAI_SENTINEL ? "" : v,
                  subcategoriaId: SUB_USAR_PAI,
                })
              }
              disabled={fieldDisabled}
            >
              <SelectTrigger id="edit-cat-pai" className={cn(SELECT_TRIGGER_CLASS)}>
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
            <Label htmlFor="edit-sub">Subcategoria</Label>
            <Select
              value={
                draft.subcategoriaId && draft.subcategoriaId !== SUB_USAR_PAI
                  ? draft.subcategoriaId
                  : SUB_USAR_PAI
              }
              onValueChange={(v) =>
                patch({ subcategoriaId: v === SUB_USAR_PAI ? SUB_USAR_PAI : v })
              }
              disabled={fieldDisabled || !draft.categoriaPaiId || subsLoading}
            >
              <SelectTrigger id="edit-sub" className={cn(SELECT_TRIGGER_CLASS)}>
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

          <div className="rounded-2xl border border-dashed border-emerald-200/80 bg-emerald-50/30 p-4">
            <p className="text-sm font-semibold text-slate-900">Criar nova subcategoria</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Input
                value={newSubNome}
                onChange={(e) => setNewSubNome(e.target.value)}
                disabled={fieldDisabled || !draft.categoriaPaiId || creatingSub}
                placeholder="Nome"
                className={INPUT_CLASS}
              />
              <Input
                value={newSubSlug}
                onChange={(e) => setNewSubSlug(e.target.value)}
                disabled={fieldDisabled || !draft.categoriaPaiId || creatingSub}
                placeholder="Slug (opcional)"
                className={INPUT_CLASS}
              />
            </div>
            <Button
              type="button"
              className="mt-3 bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={fieldDisabled || !draft.categoriaPaiId || creatingSub}
              onClick={() => void handleCreateSubcategoria()}
            >
              {creatingSub ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  Criando…
                </>
              ) : (
                <>
                  <Plus className="mr-2 size-4" aria-hidden />
                  Criar subcategoria
                </>
              )}
            </Button>
          </div>
          </>
          )}
        </FormSection>

        <FormSection
          icon={Tag}
          title="Marca"
          description="Marca obrigatória — selecione uma existente ou cadastre uma nova."
        >
          {catalogLoading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Carregando marcas…
            </p>
          ) : (
          <>
          <div className="space-y-2">
            <Label htmlFor="edit-marca">Marca</Label>
            <Select
              value={marcaSelectValue}
              onValueChange={(v) => {
                patch({ marcaId: v === MARCA_PLACEHOLDER ? "" : v });
                if (v !== MARCA_PLACEHOLDER && marcas.some((m) => String(m.id) === v)) {
                  setMarcaAtual(marcas.find((m) => String(m.id) === v) ?? null);
                }
              }}
              disabled={fieldDisabled}
            >
              <SelectTrigger id="edit-marca" className={cn(SELECT_TRIGGER_CLASS)}>
                <SelectValue placeholder="Selecione uma marca" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={MARCA_PLACEHOLDER} disabled>
                  Selecione uma marca
                </SelectItem>
                {marcaAtualNoSelect && marcaAtual ? (
                  <SelectItem value={String(marcaAtual.id)}>
                    {marcaAtual.nome} (inativa)
                  </SelectItem>
                ) : null}
                {marcas.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    {m.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {marcaAtualNoSelect && marcaAtual ? (
              <p className="text-sm text-amber-800" role="status">
                Marca atual: {marcaAtual.nome} (inativa)
              </p>
            ) : null}
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={fieldDisabled}
            onClick={() => {
              setShowMarcaForm((v) => !v);
              setMarcaFormError(null);
            }}
          >
            {showMarcaForm ? "Fechar cadastro de marca" : "Cadastrar nova marca"}
          </Button>

          {showMarcaForm ? (
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
              <Input
                value={newMarcaNome}
                onChange={(e) => setNewMarcaNome(e.target.value)}
                disabled={creatingMarca}
                placeholder="Nome da marca"
                className={INPUT_CLASS}
              />
              <Input
                value={newMarcaSlug}
                onChange={(e) => setNewMarcaSlug(e.target.value)}
                disabled={creatingMarca}
                placeholder="Slug"
                className={INPUT_CLASS}
              />
              <textarea
                value={newMarcaDescricao}
                onChange={(e) => setNewMarcaDescricao(e.target.value)}
                disabled={creatingMarca}
                rows={3}
                placeholder="Descrição"
                className={cn(INPUT_CLASS, "min-h-20 resize-y py-3")}
              />
              <Input
                type="file"
                accept="image/*"
                disabled={creatingMarca}
                className={cn(INPUT_CLASS, "h-auto py-2")}
                onChange={(e) => setNewMarcaLogo(e.target.files?.[0] ?? null)}
              />
              {marcaFormError ? (
                <p className="text-sm text-destructive" role="alert">
                  {marcaFormError}
                </p>
              ) : null}
              <Button type="button" disabled={creatingMarca} onClick={() => void handleCreateMarca()}>
                {creatingMarca ? "Criando marca…" : "Criar marca"}
              </Button>
            </div>
          ) : null}
          {draft.marcaId && marcaSelectValue === MARCA_PLACEHOLDER ? (
            <p className="text-sm text-amber-800" role="status">
              Marca não encontrada
            </p>
          ) : null}
          </>
          )}
        </FormSection>

        <FormSection
          icon={Package}
          title="Dados opcionais"
          description="Slug, promoção, SKU, medidas e visibilidade na vitrine."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="edit-slug">Slug</Label>
              <Input
                id="edit-slug"
                value={draft.slug}
                onChange={(e) => patch({ slug: e.target.value })}
                disabled={fieldDisabled}
                className={INPUT_CLASS}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-promo">Preço promocional (opcional)</Label>
              <Input
                id="edit-promo"
                inputMode="decimal"
                value={draft.preco_promocional}
                onChange={(e) => patch({ preco_promocional: e.target.value })}
                disabled={fieldDisabled}
                className={INPUT_CLASS}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-sku">SKU (opcional)</Label>
              <Input
                id="edit-sku"
                value={draft.sku}
                onChange={(e) => patch({ sku: e.target.value })}
                disabled={fieldDisabled}
                className={INPUT_CLASS}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-peso">Peso (g)</Label>
              <Input
                id="edit-peso"
                inputMode="numeric"
                value={draft.peso_gramas}
                onChange={(e) => patch({ peso_gramas: e.target.value })}
                disabled={fieldDisabled}
                className={INPUT_CLASS}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-alt">Altura (cm)</Label>
              <Input
                id="edit-alt"
                value={draft.altura_cm}
                onChange={(e) => patch({ altura_cm: e.target.value })}
                disabled={fieldDisabled}
                className={INPUT_CLASS}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-larg">Largura (cm)</Label>
              <Input
                id="edit-larg"
                value={draft.largura_cm}
                onChange={(e) => patch({ largura_cm: e.target.value })}
                disabled={fieldDisabled}
                className={INPUT_CLASS}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-comp">Comprimento (cm)</Label>
              <Input
                id="edit-comp"
                value={draft.comprimento_cm}
                onChange={(e) => patch({ comprimento_cm: e.target.value })}
                disabled={fieldDisabled}
                className={INPUT_CLASS}
              />
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:col-span-2">
              <Checkbox
                id="edit-ativo"
                checked={draft.ativo}
                onCheckedChange={(c) => patch({ ativo: c === true })}
                disabled={fieldDisabled}
              />
              <Label htmlFor="edit-ativo" className="text-sm font-medium text-slate-800">
                Produto ativo na vitrine
              </Label>
            </div>
          </div>
        </FormSection>

        <FormSection icon={ImagePlus} title="Imagens" description="Gerenciamento de fotos do anúncio.">
          <ProdutoImagesEditPanel
            ref={imagesPanelRef}
            produtoId={produtoId}
            imagens={imagensGaleria}
            disabled={fieldDisabled}
            onImagensChange={setImagensGaleria}
            onUploaded={async () => {
              const pRes = await getProdutoById(produtoId);
              setImagensGaleria(extractProdutoImagensViews(pRes.data));
            }}
            className="rounded-2xl border-slate-200 shadow-sm"
          />
        </FormSection>

        <FormSection
          icon={ListChecks}
          title="Características"
          description="Indexadores e filtros técnicos do produto."
        >
          <EmBreveCard titulo="Edição de características" />
        </FormSection>

        <div className="sticky bottom-0 z-10 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className={cn("w-full sm:w-auto", venderProdutoSecondaryButtonClass)}
            disabled={submitting}
            asChild
          >
            <Link to={previewHref}>Cancelar</Link>
          </Button>
          <Button
            type="submit"
            disabled={fieldDisabled}
            className="w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto sm:min-w-[200px]"
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
        </div>
      </div>
    </form>
  );
}



