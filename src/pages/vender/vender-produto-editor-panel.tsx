import { useCallback, useEffect, useState, type ReactNode } from "react";
import { isAxiosError } from "axios";
import { ChevronDown } from "lucide-react";

import * as categoriasRoutes from "@/api/endpoints/categorias.routes";
import * as marcasRoutes from "@/api/endpoints/marcas.routes";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getAxiosErrorMessage } from "@/lib/api-error";
import { notifySuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { isProdutoCondicao, PRODUTO_CONDICAO_OPTIONS } from "@/types/produto";
import type { CategoriaPai, Subcategoria } from "@/types/categoria";
import type { Marca } from "@/types/marca";
import { extractCategoriaMarcaIds } from "@/types/produto";
import {
  SUB_USAR_PAI,
  slugify,
  type ProdutoSellerEditorDraft,
} from "@/pages/vender/vender-produto-editor-utils";

function EditorSection({
  id,
  title,
  open,
  onToggle,
  children,
  disabled,
}: {
  id: string;
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <button
        type="button"
        id={`${id}-trigger`}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        disabled={disabled}
        className="flex w-full min-w-0 items-center justify-between gap-2 px-4 py-3 text-left text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-50"
        onClick={onToggle}
      >
        <span className="break-words">{title}</span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-slate-500 transition", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open ? (
        <div id={`${id}-panel`} className="space-y-3 px-4 pb-4">
          {children}
        </div>
      ) : null}
    </div>
  );
}

type Props = {
  draft: ProdutoSellerEditorDraft;
  rawPayload: unknown;
  disabled: boolean;
  onDraftChange: (next: ProdutoSellerEditorDraft) => void;
  onLabelsChange: (labels: { categoriaLabel: string | null; marcaLabel: string | null }) => void;
};

export function VenderProdutoEditorPanel({
  draft,
  rawPayload,
  disabled,
  onDraftChange,
  onLabelsChange,
}: Props) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    publicacao: true,
    principais: true,
    preco: false,
    categoria: false,
    marca: false,
    opcionais: false,
    futuro: false,
  });

  const [pais, setPais] = useState<CategoriaPai[]>([]);
  const [subs, setSubs] = useState<Subcategoria[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [newSubNome, setNewSubNome] = useState("");
  const [newSubSlug, setNewSubSlug] = useState("");
  const [creatingSub, setCreatingSub] = useState(false);

  const [showCreateMarca, setShowCreateMarca] = useState(false);
  const [marcaNome, setMarcaNome] = useState("");
  const [marcaSlug, setMarcaSlug] = useState("");
  const [marcaDescricao, setMarcaDescricao] = useState("");
  const [marcaLogo, setMarcaLogo] = useState<File | null>(null);
  const [creatingMarca, setCreatingMarca] = useState(false);
  const [sectionError, setSectionError] = useState<string | null>(null);

  const patch = (partial: Partial<ProdutoSellerEditorDraft>) => {
    onDraftChange({ ...draft, ...partial });
  };

  const toggle = (key: string) => {
    setOpenSections((s) => ({ ...s, [key]: !s[key] }));
  };

  const loadSubs = useCallback(async (pai: number) => {
    const list = await categoriasRoutes.getMinhasSubcategorias({
      categoria_pai_id: pai,
    });
    setSubs(list);
    return list;
  }, []);

  const loadMarcas = useCallback(async () => {
    const list = await marcasRoutes.getMarcas();
    setMarcas(list);
    return list;
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setCatalogLoading(true);
      setCatalogError(null);
      try {
        const [listPai, marcasList, allSubs] = await Promise.all([
          categoriasRoutes.getCategoriasPai(),
          marcasRoutes.getMarcas(),
          categoriasRoutes.getMinhasSubcategorias(),
        ]);
        if (cancelled) return;
        setPais(listPai);
        setMarcas(marcasList);

        const { categoria_id: initialCat } = extractCategoriaMarcaIds(rawPayload);
        let resolvedPai = draft.categoriaPaiId;
        let resolvedSub = draft.subcategoriaId;

        if (initialCat != null) {
          const asSub = allSubs.find((s) => s.id === initialCat);
          if (asSub) {
            resolvedPai = String(asSub.categoria_pai_id);
            resolvedSub = String(asSub.id);
          } else {
            resolvedPai = String(initialCat);
            resolvedSub = SUB_USAR_PAI;
          }
        } else if (!resolvedPai && listPai[0]) {
          resolvedPai = String(listPai[0].id);
          resolvedSub = SUB_USAR_PAI;
        }

        if (resolvedPai) {
          await loadSubs(Number.parseInt(resolvedPai, 10));
        }

        if (
          resolvedPai !== draft.categoriaPaiId ||
          resolvedSub !== draft.subcategoriaId
        ) {
          onDraftChange({
            ...draft,
            categoriaPaiId: resolvedPai,
            subcategoriaId: resolvedSub,
          });
        }
      } catch (e) {
        if (!cancelled) {
          setCatalogError(getAxiosErrorMessage(e, "Não foi possível carregar categorias e marcas."));
        }
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init categoria/marca uma vez por payload
  }, [rawPayload]);

  useEffect(() => {
    if (!draft.categoriaPaiId) {
      setSubs([]);
      return;
    }
    void loadSubs(Number.parseInt(draft.categoriaPaiId, 10)).catch(() => {
      setSubs([]);
    });
  }, [draft.categoriaPaiId, loadSubs]);

  useEffect(() => {
    const paiNome = pais.find((p) => String(p.id) === draft.categoriaPaiId)?.nome;
    let catLabel: string | null = paiNome ?? null;
    if (draft.subcategoriaId && draft.subcategoriaId !== SUB_USAR_PAI) {
      const subNome = subs.find((s) => String(s.id) === draft.subcategoriaId)?.nome;
      if (subNome) catLabel = subNome;
    }
    const marcaLabel =
      marcas.find((m) => String(m.id) === draft.marcaId)?.nome ?? null;
    onLabelsChange({ categoriaLabel: catLabel, marcaLabel });
  }, [
    draft.categoriaPaiId,
    draft.subcategoriaId,
    draft.marcaId,
    pais,
    subs,
    marcas,
    onLabelsChange,
  ]);

  const createSub = async () => {
    const nome = newSubNome.trim();
    if (!nome) {
      setSectionError("Informe o nome da subcategoria.");
      return;
    }
    const paiNum = Number.parseInt(draft.categoriaPaiId, 10);
    if (!Number.isFinite(paiNum)) {
      setSectionError("Selecione a categoria principal.");
      return;
    }
    setCreatingSub(true);
    setSectionError(null);
    try {
      const slugT = newSubSlug.trim();
      const created = await categoriasRoutes.createSubcategoria({
        categoria_pai_id: paiNum,
        nome,
        ...(slugT ? { slug: slugT } : {}),
        ativo: true,
      });
      await loadSubs(paiNum);
      patch({ subcategoriaId: String(created.id) });
      setNewSubNome("");
      setNewSubSlug("");
      notifySuccess("Subcategoria criada", "Subcategoria selecionada no rascunho.");
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 409) {
        setSectionError("Já existe uma subcategoria com esse slug.");
        return;
      }
      setSectionError(getAxiosErrorMessage(err, "Não foi possível criar a subcategoria."));
    } finally {
      setCreatingSub(false);
    }
  };

  const createMarca = async () => {
    const n = marcaNome.trim();
    const s = marcaSlug.trim();
    const d = marcaDescricao.trim();
    if (!n) {
      setSectionError("Informe o nome da marca.");
      return;
    }
    if (!s) {
      setSectionError("Informe o slug da marca.");
      return;
    }
    if (!/^[-a-z0-9]+$/i.test(s)) {
      setSectionError("Slug inválido: use letras minúsculas, números e hífens.");
      return;
    }
    if (!d) {
      setSectionError("Informe a descrição da marca.");
      return;
    }
    setCreatingMarca(true);
    setSectionError(null);
    try {
      const created = await marcasRoutes.createMarca({
        meta: { nome: n, slug: s, descricao: d, ativo: true },
        logo: marcaLogo ?? undefined,
      });
      await loadMarcas();
      patch({ marcaId: String(created.id) });
      setShowCreateMarca(false);
      setMarcaNome("");
      setMarcaSlug("");
      setMarcaDescricao("");
      setMarcaLogo(null);
      notifySuccess("Marca criada", "Marca selecionada no rascunho.");
    } catch (err) {
      if (isAxiosError(err)) {
        if (err.response?.status === 409) {
          setSectionError("Já existe uma marca com esse slug.");
          return;
        }
        if (err.response?.status === 403) {
          setSectionError("Você não tem permissão para editar esta marca.");
          return;
        }
      }
      setSectionError(getAxiosErrorMessage(err, "Não foi possível criar a marca."));
    } finally {
      setCreatingMarca(false);
    }
  };

  return (
    <aside
      className="w-full min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto"
      aria-label="Configurações do produto"
    >
      <div className="border-b border-slate-100 px-4 py-4">
        <h3 className="text-base font-semibold text-slate-900">Configurações do produto</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Alterações refletem na prévia ao lado. Salve com &quot;Atualizar produto&quot;.
        </p>
        {catalogLoading ? (
          <p className="mt-2 text-xs text-muted-foreground">Carregando categorias e marcas…</p>
        ) : null}
        {catalogError ? (
          <p className="mt-2 text-xs text-destructive" role="alert">
            {catalogError}
          </p>
        ) : null}
        {sectionError ? (
          <p className="mt-2 text-xs text-destructive" role="alert">
            {sectionError}
          </p>
        ) : null}
      </div>

      <EditorSection
        id="pub"
        title="Publicação"
        open={openSections.publicacao}
        onToggle={() => toggle("publicacao")}
        disabled={disabled}
      >
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3">
          <Checkbox
            checked={draft.ativo}
            onCheckedChange={(c) => patch({ ativo: c === true })}
            disabled={disabled}
            className="mt-0.5"
          />
          <span className="text-sm text-muted-foreground">
            Produto ativo na vitrine
          </span>
        </label>
        {draft.status ? (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Status (somente leitura)</Label>
            <p className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">{draft.status}</p>
          </div>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="ed-condicao">Condição</Label>
          <select
            id="ed-condicao"
            value={draft.condicao}
            disabled={disabled}
            onChange={(e) => {
              const v = e.target.value;
              if (isProdutoCondicao(v)) patch({ condicao: v });
            }}
            className="h-10 w-full rounded-xl border border-input bg-transparent px-3 text-sm shadow-sm"
          >
            {PRODUTO_CONDICAO_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </EditorSection>

      <EditorSection
        id="pri"
        title="Dados principais"
        open={openSections.principais}
        onToggle={() => toggle("principais")}
        disabled={disabled}
      >
        <div className="space-y-2">
          <Label htmlFor="ed-titulo">Título</Label>
          <Input
            id="ed-titulo"
            value={draft.titulo}
            disabled={disabled}
            onChange={(e) => patch({ titulo: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ed-desc">Descrição</Label>
          <textarea
            id="ed-desc"
            value={draft.descricao}
            disabled={disabled}
            rows={5}
            onChange={(e) => patch({ descricao: e.target.value })}
            className={cn(
              "w-full resize-y rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-sm",
              "focus-visible:ring-2 focus-visible:ring-emerald-100 focus-visible:outline-none",
            )}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ed-slug">Slug (opcional)</Label>
          <Input
            id="ed-slug"
            value={draft.slug}
            disabled={disabled}
            onChange={(e) => patch({ slug: e.target.value })}
          />
        </div>
      </EditorSection>

      <EditorSection
        id="preco"
        title="Preço"
        open={openSections.preco}
        onToggle={() => toggle("preco")}
        disabled={disabled}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <div className="space-y-2">
            <Label htmlFor="ed-preco">Preço (R$)</Label>
            <Input
              id="ed-preco"
              inputMode="decimal"
              value={draft.preco}
              disabled={disabled}
              onChange={(e) => patch({ preco: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ed-promo">Preço promocional</Label>
            <Input
              id="ed-promo"
              inputMode="decimal"
              value={draft.preco_promocional}
              disabled={disabled}
              placeholder="Opcional"
              onChange={(e) => patch({ preco_promocional: e.target.value })}
            />
          </div>
        </div>
      </EditorSection>

      <EditorSection
        id="cat"
        title="Categoria"
        open={openSections.categoria}
        onToggle={() => toggle("categoria")}
        disabled={disabled || catalogLoading}
      >
        <div className="space-y-2">
          <Label htmlFor="ed-cat-pai">Categoria principal</Label>
          <select
            id="ed-cat-pai"
            className="h-10 w-full rounded-xl border border-input bg-transparent px-3 text-sm"
            value={draft.categoriaPaiId}
            disabled={disabled}
            onChange={(e) => patch({ categoriaPaiId: e.target.value, subcategoriaId: SUB_USAR_PAI })}
          >
            <option value="">Selecione…</option>
            {pais.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ed-cat-sub">Subcategoria (opcional)</Label>
          <select
            id="ed-cat-sub"
            className="h-10 w-full rounded-xl border border-input bg-transparent px-3 text-sm"
            value={draft.subcategoriaId}
            disabled={disabled || !draft.categoriaPaiId}
            onChange={(e) => patch({ subcategoriaId: e.target.value })}
          >
            <option value={SUB_USAR_PAI}>Usar só categoria principal</option>
            {subs.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/30 p-3">
          <p className="text-xs font-medium text-emerald-900">Nova subcategoria</p>
          <Input
            placeholder="Nome"
            value={newSubNome}
            disabled={disabled}
            onChange={(e) => setNewSubNome(e.target.value)}
          />
          <Input
            placeholder="Slug (opcional)"
            value={newSubSlug}
            disabled={disabled}
            onChange={(e) => setNewSubSlug(e.target.value)}
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={creatingSub || disabled || !draft.categoriaPaiId}
            onClick={() => void createSub()}
          >
            {creatingSub ? "Criando…" : "Criar subcategoria"}
          </Button>
        </div>
      </EditorSection>

      <EditorSection
        id="marca"
        title="Marca"
        open={openSections.marca}
        onToggle={() => toggle("marca")}
        disabled={disabled || catalogLoading}
      >
        <div className="space-y-2">
          <Label htmlFor="ed-marca">Marca</Label>
          <select
            id="ed-marca"
            className="h-10 w-full rounded-xl border border-input bg-transparent px-3 text-sm"
            value={draft.marcaId}
            disabled={disabled}
            onChange={(e) => patch({ marcaId: e.target.value })}
          >
            <option value="">Selecione…</option>
            {marcas.map((m) => (
              <option key={m.id} value={String(m.id)}>
                {m.nome}
              </option>
            ))}
          </select>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => setShowCreateMarca((v) => !v)}
        >
          {showCreateMarca ? "Fechar criação" : "Criar nova marca"}
        </Button>
        {showCreateMarca ? (
          <div className="space-y-2 rounded-xl border border-slate-200 p-3">
            <Input
              placeholder="Nome"
              value={marcaNome}
              disabled={disabled}
              onChange={(e) => setMarcaNome(e.target.value)}
            />
            <Input
              placeholder="Slug"
              value={marcaSlug}
              disabled={disabled}
              onChange={(e) => setMarcaSlug(e.target.value)}
              onBlur={() => {
                if (!marcaSlug.trim() && marcaNome.trim()) setMarcaSlug(slugify(marcaNome));
              }}
            />
            <textarea
              placeholder="Descrição"
              value={marcaDescricao}
              disabled={disabled}
              onChange={(e) => setMarcaDescricao(e.target.value)}
              className="min-h-[72px] w-full resize-y rounded-xl border border-input px-3 py-2 text-sm"
            />
            <Input
              type="file"
              accept="image/*"
              className="text-sm"
              disabled={disabled}
              onChange={(e) => setMarcaLogo(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              size="sm"
              disabled={creatingMarca || disabled}
              onClick={() => void createMarca()}
            >
              {creatingMarca ? "Salvando…" : "Registrar marca"}
            </Button>
          </div>
        ) : null}
      </EditorSection>

      <EditorSection
        id="opc"
        title="Dados opcionais"
        open={openSections.opcionais}
        onToggle={() => toggle("opcionais")}
        disabled={disabled}
      >
        <div className="space-y-2">
          <Label htmlFor="ed-sku">SKU</Label>
          <Input
            id="ed-sku"
            value={draft.sku}
            disabled={disabled}
            onChange={(e) => patch({ sku: e.target.value })}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <div className="space-y-2">
            <Label htmlFor="ed-peso">Peso (gramas)</Label>
            <Input
              id="ed-peso"
              inputMode="numeric"
              value={draft.peso_gramas}
              disabled={disabled}
              onChange={(e) => patch({ peso_gramas: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ed-alt">Altura (cm)</Label>
            <Input
              id="ed-alt"
              inputMode="decimal"
              value={draft.altura_cm}
              disabled={disabled}
              onChange={(e) => patch({ altura_cm: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ed-larg">Largura (cm)</Label>
            <Input
              id="ed-larg"
              inputMode="decimal"
              value={draft.largura_cm}
              disabled={disabled}
              onChange={(e) => patch({ largura_cm: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ed-comp">Comprimento (cm)</Label>
            <Input
              id="ed-comp"
              inputMode="decimal"
              value={draft.comprimento_cm}
              disabled={disabled}
              onChange={(e) => patch({ comprimento_cm: e.target.value })}
            />
          </div>
        </div>
      </EditorSection>

      <EditorSection
        id="futuro"
        title="Em breve"
        open={openSections.futuro}
        onToggle={() => toggle("futuro")}
      >
        <p className="text-xs text-muted-foreground">
          Edição de imagens será adicionada em uma próxima etapa.
        </p>
        <p className="text-xs text-muted-foreground">
          Edição de características será adicionada em uma próxima etapa.
        </p>
      </EditorSection>
    </aside>
  );
}
