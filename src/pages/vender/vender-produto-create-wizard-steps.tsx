import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Link } from "react-router-dom";
import {
  Check,
  ChevronDown,
  ImagePlus,
  Lightbulb,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { categoriasRoutes, marcasRoutes, paths } from "@/api/endpoints";
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
import {
  INPUT_CLASS,
  SELECT_TRIGGER_CLASS,
} from "@/pages/vender/vender-produto-create-form";
import {
  WizardStepMedidas,
  type WizardCatalogProps,
} from "@/pages/vender/vender-produto-edit-wizard-steps";
import { SUB_USAR_PAI, slugify } from "@/pages/vender/vender-produto-editor-utils";
import {
  formatProdutoCondicaoLabel,
  isProdutoCondicao,
  PRODUTO_CONDICAO_OPTIONS,
  type ProdutoCondicao,
} from "@/types/produto";
import type { VenderProdutoCreateCatalog } from "@/pages/vender/use-vender-produto-create";
import { getCategoryRequirements } from "@/pages/vender/category-product-requirements";
import { CurrencyDraftInput } from "@/pages/vender/currency-draft-input";
import {
  ProdutoImagesDraftManager,
  ProdutoImagesReviewGrid,
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
  newCreateIndexadorRow,
  parseCurrencyBR,
  validateCreatePriceField,
  validatePromoNotAbovePrice,
  type CreateImageItem,
  type CreateIndexadorRow,
} from "@/pages/vender/vender-produto-create-utils";

function RequiredBadge() {
  return (
    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
      Obrigatório
    </span>
  );
}

function FieldHelper({ children }: { children: string }) {
  return <p className="text-xs leading-relaxed text-slate-500">{children}</p>;
}

export function CreateStepPrincipais({ draft, patch, disabled }: WizardCatalogProps) {
  return (
    <div className="space-y-5">
      <div className="flex gap-3 rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/90 via-white to-slate-50/80 p-4 text-sm text-slate-700 shadow-sm">
        <Lightbulb className="mt-0.5 size-9 shrink-0 text-emerald-600" aria-hidden />
        <div>
          <p className="font-semibold text-emerald-900">Dica para vender melhor</p>
          <p className="mt-1 leading-relaxed">
            Anúncios com título claro, descrição completa e boas fotos tendem a gerar mais confiança.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Label htmlFor="wiz-titulo">Título</Label>
          <RequiredBadge />
        </div>
        <FieldHelper>
          Use um nome claro, com modelo, tipo e principal característica.
        </FieldHelper>
        <Input
          id="wiz-titulo"
          value={draft.titulo}
          onChange={(e) => patch({ titulo: e.target.value })}
          disabled={disabled}
          className={INPUT_CLASS}
        />
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Label htmlFor="wiz-descricao">Descrição</Label>
          <RequiredBadge />
        </div>
        <FieldHelper>
          Conte estado, diferenciais, compatibilidade e detalhes importantes.
        </FieldHelper>
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
        <div className="flex flex-wrap items-center gap-2">
          <Label htmlFor="wiz-condicao">Condição</Label>
          <RequiredBadge />
        </div>
        <FieldHelper>Informe se o produto é novo, semi-novo ou usado.</FieldHelper>
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

      <div className="space-y-2">
        <FieldHelper>Quando ativo, o produto poderá aparecer na sua vitrine após o cadastro.</FieldHelper>
        <Label
          htmlFor="wiz-ativo"
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 transition-colors",
            draft.ativo
              ? "border-emerald-200/80 bg-emerald-50/50 shadow-sm"
              : "border-slate-200/90 bg-white shadow-sm",
            disabled && "pointer-events-none cursor-not-allowed opacity-50",
          )}
        >
          <Checkbox
            id="wiz-ativo"
            checked={draft.ativo}
            onCheckedChange={(c) => patch({ ativo: c === true })}
            disabled={disabled}
          />
          <span className="flex-1 text-sm font-medium text-slate-800">
            Produto ativo na vitrine
          </span>
        </Label>
      </div>
    </div>
  );
}

const PAI_SENTINEL = "__sem_pai__";
const MARCA_PLACEHOLDER = "__placeholder__";
const TIPO_ESPECIFICO_PLACEHOLDER = "__placeholder_tipo__";

const MARCA_LOGO_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

function isValidMarcaLogoFile(file: File): boolean {
  const mime = file.type.toLowerCase();
  if (mime.startsWith("image/")) {
    return MARCA_LOGO_MIME_TYPES.has(mime);
  }
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext === "png" || ext === "jpg" || ext === "jpeg" || ext === "webp";
}

type CategoriaMarcaStepProps = VenderProdutoCreateCatalog & {
  categoryLocked?: boolean;
  stepError?: string | null;
};

export function CreateStepCategoriaMarca({
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
  reloadSubcategorias,
  categoriaSlug,
  categoryLocked = false,
  setCategoryLocked,
  stepError = null,
}: CategoriaMarcaStepProps) {
  const [showCreateSub, setShowCreateSub] = useState(false);
  const [newSubNome, setNewSubNome] = useState("");
  const [creatingSub, setCreatingSub] = useState(false);
  const [subFormError, setSubFormError] = useState<string | null>(null);

  const [showMarcaForm, setShowMarcaForm] = useState(false);
  const [newMarcaNome, setNewMarcaNome] = useState("");
  const [newMarcaDescricao, setNewMarcaDescricao] = useState("");
  const [newMarcaLogo, setNewMarcaLogo] = useState<File | null>(null);
  const [creatingMarca, setCreatingMarca] = useState(false);
  const [marcaNomeError, setMarcaNomeError] = useState<string | null>(null);
  const [marcaDescricaoError, setMarcaDescricaoError] = useState<string | null>(null);
  const [marcaLogoError, setMarcaLogoError] = useState<string | null>(null);
  const [marcaFormError, setMarcaFormError] = useState<string | null>(null);
  const [marcaLogoPreviewUrl, setMarcaLogoPreviewUrl] = useState<string | null>(null);
  const newMarcaNomeInputRef = useRef<HTMLInputElement | null>(null);
  const newMarcaDescricaoRef = useRef<HTMLTextAreaElement | null>(null);
  const marcaLogoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!newMarcaLogo) {
      setMarcaLogoPreviewUrl(null);
      return;
    }
    const previewUrl = URL.createObjectURL(newMarcaLogo);
    setMarcaLogoPreviewUrl(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [newMarcaLogo]);
  const [marcaPickerOpen, setMarcaPickerOpen] = useState(false);
  const [marcaBusca, setMarcaBusca] = useState("");

  const hasPai = Boolean(draft.categoriaPaiId);
  const paiNome = categoriasPai.find((c) => String(c.id) === draft.categoriaPaiId)?.nome ?? null;
  const hasTipoEspecifico = Boolean(
    draft.subcategoriaId &&
      draft.subcategoriaId !== SUB_USAR_PAI &&
      draft.subcategoriaId !== TIPO_ESPECIFICO_PLACEHOLDER,
  );
  const subNome = hasTipoEspecifico
    ? subcategorias.find((s) => String(s.id) === draft.subcategoriaId)?.nome ?? null
    : null;

  const paiFieldError =
    stepError === "Escolha uma categoria principal." ? stepError : null;
  const tipoFieldError =
    stepError === "Escolha ou crie um tipo específico para continuar." ? stepError : null;
  const marcaFieldError =
    stepError === "Selecione ou crie uma marca." ? stepError : null;

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

  const marcaDisplayLabel =
    marcaSelectValue === MARCA_PLACEHOLDER
      ? "Selecione uma marca"
      : (marcas.find((m) => String(m.id) === marcaSelectValue)?.nome ??
        (marcaAtualNoSelect && marcaAtual ? marcaAtual.nome : null) ??
        "Selecione uma marca");

  const closeMarcaPicker = () => {
    setMarcaPickerOpen(false);
    setMarcaBusca("");
  };

  const selectMarca = (marcaId: string) => {
    patch({ marcaId });
    setMarcaAtual(marcas.find((m) => String(m.id) === marcaId) ?? marcaAtual);
    closeMarcaPicker();
  };

  const marcaBuscaNormalizada = marcaBusca.trim().toLowerCase();
  const marcasFiltradas = useMemo(() => {
    if (!marcaBuscaNormalizada) return marcas;
    return marcas.filter((m) => m.nome.toLowerCase().includes(marcaBuscaNormalizada));
  }, [marcas, marcaBuscaNormalizada]);

  const marcaInativaVisivel =
    marcaAtualNoSelect &&
    marcaAtual &&
    (!marcaBuscaNormalizada ||
      marcaAtual.nome.toLowerCase().includes(marcaBuscaNormalizada));

  const renderMarcaPickerOptions = (listClassName?: string) => (
    <div className={listClassName} role="listbox" aria-label="Lista de marcas">
      {!marcaInativaVisivel && marcasFiltradas.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-slate-500">Nenhuma marca encontrada.</p>
      ) : null}

      {marcaInativaVisivel && marcaAtual ? (
        <button
          type="button"
          role="option"
          aria-selected={marcaSelectValue === String(marcaAtual.id)}
          className={cn(
            "flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition active:bg-slate-100",
            marcaSelectValue === String(marcaAtual.id)
              ? "bg-emerald-50 text-emerald-700"
              : "text-slate-700 hover:bg-slate-50",
          )}
          onClick={() => selectMarca(String(marcaAtual.id))}
        >
          <span className="min-w-0 truncate">{marcaAtual.nome} (inativa)</span>
          {marcaSelectValue === String(marcaAtual.id) ? (
            <Check className="size-4 shrink-0 text-emerald-600" aria-hidden />
          ) : null}
        </button>
      ) : null}

      {marcasFiltradas.map((m) => {
        const value = String(m.id);
        const isSelected = marcaSelectValue === value;
        return (
          <button
            key={m.id}
            type="button"
            role="option"
            aria-selected={isSelected}
            className={cn(
              "flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition active:bg-slate-100",
              isSelected
                ? "bg-emerald-50 text-emerald-700"
                : "text-slate-700 hover:bg-slate-50",
            )}
            onClick={() => selectMarca(value)}
          >
            <span className="min-w-0 truncate">{m.nome}</span>
            {isSelected ? (
              <Check className="size-4 shrink-0 text-emerald-600" aria-hidden />
            ) : null}
          </button>
        );
      })}
    </div>
  );

  const marcaSearchField = (
    <div className="relative min-w-0">
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
        aria-hidden
      />
      <Input
        type="search"
        value={marcaBusca}
        onChange={(e) => setMarcaBusca(e.target.value)}
        placeholder="Buscar marca"
        className="h-11 rounded-xl border-slate-200 pr-4 pl-10 text-sm shadow-none"
        aria-label="Buscar marca"
      />
    </div>
  );

  const resetSubCreateForm = () => {
    setNewSubNome("");
    setSubFormError(null);
  };

  const closeSubCreateForm = () => {
    setShowCreateSub(false);
    resetSubCreateForm();
  };

  const handleCreateSub = async () => {
    if (!draft.categoriaPaiId) {
      setSubFormError("Selecione uma categoria principal antes de criar um tipo específico.");
      return;
    }
    const nome = newSubNome.trim();
    if (!nome) {
      setSubFormError("Informe o nome do tipo.");
      return;
    }
    const slug = slugify(nome);
    if (!slug) {
      setSubFormError("Informe um nome válido para gerar o identificador do tipo.");
      return;
    }
    setCreatingSub(true);
    setSubFormError(null);
    try {
      const payload = {
        categoria_pai_id: Number.parseInt(draft.categoriaPaiId, 10),
        nome,
        slug,
      };
      const created = await categoriasRoutes.createSubcategoria(payload);
      await reloadSubcategorias();
      patch({ subcategoriaId: String(created.id) });
      closeSubCreateForm();
      toast.success("Tipo específico criado e selecionado.");
    } catch (err) {
      setSubFormError(getAxiosErrorMessage(err, "Não foi possível criar o tipo específico."));
    } finally {
      setCreatingSub(false);
    }
  };

  const resetMarcaCreateForm = () => {
    setNewMarcaNome("");
    setNewMarcaDescricao("");
    setNewMarcaLogo(null);
    setMarcaNomeError(null);
    setMarcaDescricaoError(null);
    setMarcaLogoError(null);
    setMarcaFormError(null);
    if (newMarcaNomeInputRef.current) newMarcaNomeInputRef.current.value = "";
    if (newMarcaDescricaoRef.current) newMarcaDescricaoRef.current.value = "";
    if (marcaLogoInputRef.current) marcaLogoInputRef.current.value = "";
  };

  const handleMarcaLogoSelected = (file: File | null) => {
    if (!file) {
      setNewMarcaLogo(null);
      setMarcaLogoError(null);
      if (marcaLogoInputRef.current) marcaLogoInputRef.current.value = "";
      return;
    }
    if (!isValidMarcaLogoFile(file)) {
      setNewMarcaLogo(null);
      setMarcaLogoError("Use uma imagem PNG, JPG ou WEBP.");
      if (marcaLogoInputRef.current) marcaLogoInputRef.current.value = "";
      return;
    }
    setNewMarcaLogo(file);
    setMarcaLogoError(null);
  };

  const handleCreateMarca = async () => {
    const nomeRaw = newMarcaNomeInputRef.current?.value ?? newMarcaNome;
    const descricaoRaw = newMarcaDescricaoRef.current?.value ?? newMarcaDescricao;
    const nome = nomeRaw.trim();
    const descricaoM = descricaoRaw.trim();

    if (nome !== newMarcaNome) setNewMarcaNome(nome);
    if (descricaoM !== newMarcaDescricao) setNewMarcaDescricao(descricaoM);

    setMarcaNomeError(null);
    setMarcaDescricaoError(null);
    setMarcaLogoError(null);
    setMarcaFormError(null);

    let hasError = false;
    if (!nome) {
      setMarcaNomeError("Informe o nome da marca.");
      hasError = true;
    } else {
      const slugM = slugify(nome);
      if (!slugM) {
        setMarcaNomeError("Informe um nome válido para a marca.");
        hasError = true;
      }
    }
    if (!descricaoM) {
      setMarcaDescricaoError("Informe a descrição da marca.");
      hasError = true;
    }
    if (!newMarcaLogo) {
      setMarcaLogoError("Escolha uma logo para a marca.");
      hasError = true;
    } else if (!isValidMarcaLogoFile(newMarcaLogo)) {
      setMarcaLogoError("Use uma imagem PNG, JPG ou WEBP.");
      hasError = true;
    }
    if (hasError) return;

    const slugM = slugify(nome);
    if (!slugM) return;

    setCreatingMarca(true);
    try {
      const created = await marcasRoutes.createMarca({
        meta: { nome, slug: slugM, descricao: descricaoM, ativo: true },
        logo: newMarcaLogo!,
      });
      await loadMarcas();
      patch({ marcaId: String(created.id) });
      setMarcaAtual(created);
      resetMarcaCreateForm();
      setShowMarcaForm(false);
      toast.success("Marca criada e selecionada.");
    } catch (err) {
      setMarcaFormError(getAxiosErrorMessage(err, "Não foi possível criar a marca."));
    } finally {
      setCreatingMarca(false);
    }
  };

  let resumoTexto = "Escolha uma categoria principal para continuar.";
  if (hasPai && paiNome) {
    resumoTexto =
      hasTipoEspecifico && subNome
        ? `Seu produto será anunciado em: ${paiNome} > ${subNome}`
        : "Escolha um tipo específico para continuar.";
  }

  return (
    <div className="w-full min-w-0 space-y-5">
      <div className="w-full min-w-0 space-y-2">
        <Label htmlFor="create-cat-pai">Categoria principal</Label>
        {categoryLocked && hasPai && paiNome ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800">
            {paiNome}
            <p className="mt-1 text-xs font-normal text-slate-500">
              Categoria definida na escolha do anúncio.
            </p>
          </div>
        ) : (
          <div className="w-full min-w-0">
          <Select
            value={draft.categoriaPaiId || PAI_SENTINEL}
            onValueChange={(v) =>
              patch({
                categoriaPaiId: v === PAI_SENTINEL ? "" : v,
                subcategoriaId: "",
              })
            }
            disabled={disabled || categoryLocked}
          >
            <SelectTrigger
              id="create-cat-pai"
              className={cn(SELECT_TRIGGER_CLASS, "min-w-0", paiFieldError && "border-destructive")}
            >
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
        )}
        {paiFieldError ? (
          <p className="text-sm text-destructive" role="alert">
            {paiFieldError}
          </p>
        ) : null}
      </div>

      <div className="w-full min-w-0 max-w-full rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40 p-3 sm:p-5">
        <p className="text-sm font-semibold text-slate-900">Escolha o tipo específico do produto</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">
          Obrigatório. Essa escolha ajuda a organizar sua loja e melhora a classificação do anúncio.
        </p>
        <div className="mt-4 w-full min-w-0 space-y-2">
          <Label htmlFor="create-sub">Tipo específico</Label>
          <div className="w-full min-w-0">
          <Select
            value={hasTipoEspecifico ? draft.subcategoriaId : TIPO_ESPECIFICO_PLACEHOLDER}
            onValueChange={(v) => {
              if (v === TIPO_ESPECIFICO_PLACEHOLDER) return;
              patch({ subcategoriaId: v });
            }}
            disabled={disabled || !hasPai || subsLoading}
          >
            <SelectTrigger
              id="create-sub"
              className={cn(SELECT_TRIGGER_CLASS, "min-w-0", tipoFieldError && "border-destructive")}
            >
              <SelectValue
                placeholder={subsLoading ? "Carregando…" : "Selecione um tipo específico"}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TIPO_ESPECIFICO_PLACEHOLDER} disabled>
                Selecione um tipo específico
              </SelectItem>
              {subcategorias.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          </div>
          {tipoFieldError ? (
            <p className="text-sm text-destructive" role="alert">
              {tipoFieldError}
            </p>
          ) : null}
          {!hasPai ? (
            <p className="text-xs text-slate-500">Selecione uma categoria principal primeiro.</p>
          ) : subsLoading ? (
            <p className="text-xs text-slate-500">Carregando tipos específicos…</p>
          ) : subcategorias.length === 0 ? (
            <p className="text-xs text-slate-500">
              Você ainda não criou tipos específicos para esta categoria. Crie um para continuar.
            </p>
          ) : null}
        </div>

        <div className="mt-4 w-full min-w-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full text-slate-700 sm:w-auto"
            disabled={disabled || !hasPai}
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
          {!hasPai ? (
            <p className="mt-2 text-xs text-slate-500">
              Selecione uma categoria principal antes de criar um tipo específico.
            </p>
          ) : null}
        </div>

        {showCreateSub && hasPai ? (
          <div className="mt-4 w-full min-w-0 space-y-3 rounded-2xl border border-dashed border-emerald-200/80 bg-emerald-50/30 p-4 sm:p-5">
            <p className="text-sm font-semibold text-slate-900">Nova subcategoria</p>
            <p className="text-xs leading-relaxed text-slate-600">
              Exemplo: Mountain Bike, Speed, Capacete, Freio, Camisa de ciclismo.
            </p>
            <div className="space-y-2">
              <Label htmlFor="create-new-sub-nome" className="text-xs font-medium text-slate-700">
                Nome
              </Label>
              <Input
                id="create-new-sub-nome"
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
            {subFormError ? (
              <p className="text-sm text-destructive" role="alert">
                {subFormError}
              </p>
            ) : null}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
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
      </div>

      <div
        className="w-full min-w-0 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700"
        role="status"
        aria-live="polite"
      >
        {resumoTexto}
      </div>

      <div className="w-full min-w-0 space-y-2 border-t border-slate-100 pt-5">
        <Label htmlFor="create-marca">Marca</Label>

        <button
          type="button"
          id="create-marca"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={marcaPickerOpen}
          aria-label="Selecione uma marca"
          className={cn(
            SELECT_TRIGGER_CLASS,
            "min-w-0 text-left font-normal",
            marcaFieldError && "border-destructive",
          )}
          onClick={() => {
            if (disabled) return;
            setMarcaPickerOpen((open) => !open);
          }}
        >
          <span
            className={cn(
              "min-w-0 flex-1 truncate",
              marcaSelectValue === MARCA_PLACEHOLDER && "text-muted-foreground",
            )}
          >
            {marcaDisplayLabel}
          </span>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 opacity-50 transition-transform",
              marcaPickerOpen && "rotate-180",
            )}
            aria-hidden
          />
        </button>

        {marcaPickerOpen ? (
          <div
            className="mt-3 w-full min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm"
            role="region"
            aria-label="Escolha a marca"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-[#0f2744]">Escolha a marca</p>
              <button
                type="button"
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
                aria-label="Recolher seleção de marca"
                onClick={closeMarcaPicker}
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
            <div className="mx-4 mt-4 min-w-0">{marcaSearchField}</div>
            {renderMarcaPickerOptions(
              "max-h-[360px] overflow-y-auto overscroll-contain px-3 pb-3",
            )}
          </div>
        ) : null}

        {marcaFieldError ? (
          <p className="text-sm text-destructive" role="alert">
            {marcaFieldError}
          </p>
        ) : null}
        {marcaAtualNoSelect && marcaAtual ? (
          <p className="text-sm text-amber-800">Marca atual: {marcaAtual.nome} (inativa)</p>
        ) : null}
      </div>

      <div className="mt-4 space-y-4 pb-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
          disabled={disabled}
          onClick={() => {
            setShowMarcaForm((open) => {
              if (open) resetMarcaCreateForm();
              return !open;
            });
          }}
        >
          {showMarcaForm ? "Fechar cadastro de marca" : "Cadastrar nova marca"}
        </Button>
        {showMarcaForm ? (
          <div className="w-full min-w-0 space-y-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
            <div className="space-y-2">
              <Label htmlFor="create-new-marca-nome" className="text-xs font-medium text-slate-700">
                Nome da marca
              </Label>
              <Input
                ref={newMarcaNomeInputRef}
                id="create-new-marca-nome"
                name="create-new-marca-nome"
                autoComplete="off"
                value={newMarcaNome}
                onChange={(e) => {
                  setNewMarcaNome(e.target.value);
                  setMarcaNomeError(null);
                }}
                placeholder="Ex.: High One"
                disabled={disabled || creatingMarca}
                aria-invalid={Boolean(marcaNomeError)}
                className={cn(INPUT_CLASS, marcaNomeError && "border-destructive")}
              />
              {marcaNomeError ? (
                <p className="text-sm text-destructive" role="alert">
                  {marcaNomeError}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="create-new-marca-descricao"
                className="text-xs font-medium text-slate-700"
              >
                Descrição
              </Label>
              <textarea
                ref={newMarcaDescricaoRef}
                id="create-new-marca-descricao"
                name="create-new-marca-descricao"
                autoComplete="off"
                value={newMarcaDescricao}
                onChange={(e) => {
                  setNewMarcaDescricao(e.target.value);
                  setMarcaDescricaoError(null);
                }}
                rows={2}
                placeholder="Descrição da marca"
                disabled={disabled || creatingMarca}
                aria-invalid={Boolean(marcaDescricaoError)}
                className={cn(
                  INPUT_CLASS,
                  "resize-y py-2",
                  marcaDescricaoError && "border-destructive",
                )}
              />
              {marcaDescricaoError ? (
                <p className="text-sm text-destructive" role="alert">
                  {marcaDescricaoError}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-marca-logo" className="text-xs font-medium text-slate-700">
                Logo da marca
              </Label>
              <input
                ref={marcaLogoInputRef}
                id="create-marca-logo"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                disabled={disabled || creatingMarca}
                onChange={(e) => {
                  handleMarcaLogoSelected(e.target.files?.[0] ?? null);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                disabled={disabled || creatingMarca}
                onClick={() => marcaLogoInputRef.current?.click()}
              >
                <ImagePlus className="mr-2 size-4" aria-hidden />
                Selecionar logo
              </Button>
              {newMarcaLogo ? (
                <p className="text-xs text-slate-600">
                  Logo selecionada: {newMarcaLogo.name}
                </p>
              ) : (
                <p className="text-xs text-slate-500">Nenhuma logo selecionada</p>
              )}
              {marcaLogoPreviewUrl && newMarcaLogo ? (
                <div className="mt-3 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                  <img
                    src={marcaLogoPreviewUrl}
                    alt={`Prévia da logo ${newMarcaLogo.name}`}
                    className="h-16 w-16 shrink-0 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-700">{newMarcaLogo.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">PNG, JPG ou WEBP.</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-slate-600"
                    disabled={disabled || creatingMarca}
                    onClick={() => handleMarcaLogoSelected(null)}
                  >
                    Remover
                  </Button>
                </div>
              ) : null}
              {marcaLogoError ? (
                <p className="text-sm text-destructive" role="alert">
                  {marcaLogoError}
                </p>
              ) : null}
            </div>
            {marcaFormError ? (
              <p className="text-sm text-destructive" role="alert">
                {marcaFormError}
              </p>
            ) : null}
            <Button
              type="button"
              size="sm"
              className="w-full sm:w-auto"
              disabled={disabled || creatingMarca}
              onClick={() => void handleCreateMarca()}
            >
              {creatingMarca ? "Criando…" : "Criar marca"}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

type PrecoProps = {
  draft: VenderProdutoCreateCatalog["draft"];
  patch: VenderProdutoCreateCatalog["patch"];
  disabled: boolean;
  estoqueInicial: string;
  onEstoqueChange: (v: string) => void;
};

export function CreateStepPrecoEstoque({
  draft,
  patch,
  disabled,
  estoqueInicial,
  onEstoqueChange,
}: PrecoProps) {
  const precoError = validateCreatePriceField(draft.preco, { required: true });
  const promoFieldError = validateCreatePriceField(draft.preco_promocional, {
    required: false,
  });
  const promoVsPrecoError = validatePromoNotAbovePrice(
    draft.preco,
    draft.preco_promocional,
  );
  const promoError = promoFieldError ?? promoVsPrecoError;

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">Use vírgula para centavos. Ex.: 1899,90</p>
      <div className="space-y-2">
        <Label htmlFor="create-preco">Preço (R$)</Label>
        <CurrencyDraftInput
          id="create-preco"
          value={draft.preco}
          onChange={(v) => patch({ preco: v })}
          disabled={disabled}
          placeholder="Ex.: 1.899,90"
          aria-invalid={precoError ? true : undefined}
        />
        {precoError ? (
          <p className="text-sm text-destructive" role="alert">
            {precoError}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="create-promo">Preço promocional (opcional)</Label>
        <CurrencyDraftInput
          id="create-promo"
          value={draft.preco_promocional}
          onChange={(v) => patch({ preco_promocional: v })}
          disabled={disabled}
          placeholder="Ex.: 1.699,90"
          aria-invalid={promoError ? true : undefined}
        />
        {promoError ? (
          <p className="text-sm text-destructive" role="alert">
            {promoError}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="create-estoque">Estoque inicial (opcional)</Label>
        <Input
          id="create-estoque"
          inputMode="numeric"
          value={estoqueInicial}
          onChange={(e) => onEstoqueChange(e.target.value)}
          disabled={disabled}
          placeholder="10"
          className={INPUT_CLASS}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="create-sku">SKU (opcional)</Label>
        <Input
          id="create-sku"
          value={draft.sku}
          onChange={(e) => patch({ sku: e.target.value })}
          disabled={disabled}
          className={INPUT_CLASS}
        />
      </div>
    </div>
  );
}

type ImageProps = {
  images: CreateImageItem[];
  principalId: string | null;
  setPrincipalId: (id: string) => void;
  handleFilesSelected: (files: FileList | null) => void;
  removeImage: (id: string) => void;
  disabled: boolean;
};

export function CreateStepImagens(props: ImageProps) {
  return <ProdutoImagesDraftManager {...props} inputId="create-imagens" />;
}

type IndexadorProps = {
  categoriaSlug: string | null;
  requiredFieldValues: Record<string, string>;
  setRequiredFieldValues: Dispatch<SetStateAction<Record<string, string>>>;
  indexadorRows: CreateIndexadorRow[];
  setIndexadorRows: Dispatch<SetStateAction<CreateIndexadorRow[]>>;
  disabled: boolean;
};

export function CreateStepCaracteristicas({
  categoriaSlug,
  requiredFieldValues,
  setRequiredFieldValues,
  indexadorRows,
  setIndexadorRows,
  disabled,
}: IndexadorProps) {
  const requiredFields = getCategoryRequirements(categoriaSlug);

  return (
    <div className="space-y-8">
      {requiredFields.length > 0 ? (
        <section className="space-y-4">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-900">Detalhes obrigatórios</h3>
            <p className="text-xs text-slate-600">
              Campos exigidos para anúncios nesta categoria.
            </p>
          </div>
          <div className="space-y-3">
            {requiredFields.map((campo) => (
              <div className="space-y-2" key={campo}>
                <Label htmlFor={`req-${campo}`} className="text-sm font-medium text-slate-800">
                  {campo}
                </Label>
                <Input
                  id={`req-${campo}`}
                  value={requiredFieldValues[campo] ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setRequiredFieldValues((prev) => ({ ...prev, [campo]: v }));
                  }}
                  disabled={disabled}
                  className={INPUT_CLASS}
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-4 pb-6">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-slate-900">Características extras</h3>
          <p className="text-xs text-slate-600">Opcional — informações adicionais para busca e filtros.</p>
        </div>
      {indexadorRows.map((row, idx) => (
        <div
          key={row.id}
          className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/40 p-4 sm:grid-cols-[1fr_1fr_auto]"
        >
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-slate-600">Campo</Label>
            <Input
              value={row.campo}
              onChange={(e) => {
                const v = e.target.value;
                setIndexadorRows((prev) =>
                  prev.map((r) => (r.id === row.id ? { ...r, campo: v } : r)),
                );
              }}
              disabled={disabled}
              placeholder="ex.: aro"
              className={INPUT_CLASS}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-slate-600">Valor</Label>
            <Input
              value={row.valor}
              onChange={(e) => {
                const v = e.target.value;
                setIndexadorRows((prev) =>
                  prev.map((r) => (r.id === row.id ? { ...r, valor: v } : r)),
                );
              }}
              disabled={disabled}
              placeholder="ex.: 29"
              className={INPUT_CLASS}
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={disabled}
              onClick={() =>
                setIndexadorRows((prev) => prev.filter((r) => r.id !== row.id))
              }
              aria-label={`Remover característica ${idx + 1}`}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
          </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        disabled={disabled}
        onClick={() => setIndexadorRows((prev) => [...prev, newCreateIndexadorRow()])}
      >
        <Plus className="mr-2 size-4" aria-hidden />
        Adicionar característica
      </Button>
      </section>
    </div>
  );
}

export function CreateStepOpcionais(props: WizardCatalogProps) {
  return <WizardStepMedidas {...props} showSlug={false} />;
}

function formatBrl(raw: string): string {
  const n = parseCurrencyBR(raw);
  if (n == null) return raw.trim() || "—";
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
  } catch {
    return String(n);
  }
}

type ReviewSectionId =
  | "principais"
  | "categoria"
  | "preco"
  | "imagens"
  | "detalhes"
  | "medidas";

type ReviewProps = VenderProdutoCreateCatalog & {
  estoqueInicial: string;
  images: CreateImageItem[];
  principalId: string | null;
  categoriaSlug: string | null;
  requiredFieldValues: Record<string, string>;
  indexadorRows: CreateIndexadorRow[];
  condicao: ProdutoCondicao;
  ativo: boolean;
  onGoToStep: (step: number) => void;
};

export function CreateStepRevisao({
  draft,
  categoriasPai,
  subcategorias,
  marcas,
  marcaAtual,
  estoqueInicial,
  images,
  principalId,
  categoriaSlug,
  requiredFieldValues,
  indexadorRows,
  condicao,
  ativo,
  onGoToStep,
}: ReviewProps) {
  const { openSections, toggleSection } = useReviewSections<ReviewSectionId>({
    principais: false,
    categoria: false,
    preco: false,
    imagens: false,
    detalhes: false,
    medidas: false,
  });

  const condicaoLabel = formatProdutoCondicaoLabel(condicao);
  const titulo = draft.titulo.trim();
  const descricao = draft.descricao.trim();

  const paiNome =
    categoriasPai.find((c) => String(c.id) === draft.categoriaPaiId)?.nome ?? null;
  const subNome =
    draft.subcategoriaId &&
    draft.subcategoriaId !== SUB_USAR_PAI &&
    draft.subcategoriaId !== TIPO_ESPECIFICO_PLACEHOLDER
      ? subcategorias.find((s) => String(s.id) === draft.subcategoriaId)?.nome ?? null
      : null;
  const marcaNome =
    marcas.find((m) => String(m.id) === draft.marcaId)?.nome ?? marcaAtual?.nome ?? null;

  const requiredFields = getCategoryRequirements(categoriaSlug);
  const obrigatorios = requiredFields
    .map((campo) => {
      const valor = (requiredFieldValues[campo] ?? "").trim();
      return valor ? { campo, valor } : null;
    })
    .filter((r): r is { campo: string; valor: string } => r != null);
  const extras = indexadorRows.filter((r) => r.campo.trim() && r.valor.trim());

  const medidasPreenchidas = [
    draft.peso_gramas.trim() ? { label: "Peso", value: `${draft.peso_gramas.trim()} g` } : null,
    draft.altura_cm.trim() ? { label: "Altura", value: `${draft.altura_cm.trim()} cm` } : null,
    draft.largura_cm.trim() ? { label: "Largura", value: `${draft.largura_cm.trim()} cm` } : null,
    draft.comprimento_cm.trim()
      ? { label: "Comprimento", value: `${draft.comprimento_cm.trim()} cm` }
      : null,
  ].filter((m): m is { label: string; value: string } => m != null);

  const estoqueLabel = estoqueInicial.trim() ? estoqueInicial.trim() : "0 (padrão)";
  const precoFmt = formatBrl(draft.preco);
  const promoFmt = draft.preco_promocional.trim() ? formatBrl(draft.preco_promocional) : null;
  const precoDisplay = precoFmt !== "—" ? precoFmt : "Não informado";
  const promoDisplay = promoFmt ?? "Não informado";

  const capaIndex =
    images.length > 0
      ? Math.max(0, principalId ? images.findIndex((im) => im.id === principalId) : 0)
      : -1;

  const detalhesCount = obrigatorios.length + extras.length;

  return (
    <div className="w-full min-w-0 space-y-4">
      <ReviewIntroBanner
        title="Confira antes de publicar"
        description={
          <>
            Revise os dados do anúncio por seção. Use <span className="font-semibold">Editar</span>{" "}
            para voltar a qualquer etapa.
          </>
        }
      />

      <ReviewSectionCard
        title="Dados principais"
        summary={
          titulo
            ? `${titulo} · ${condicaoLabel}`
            : "Título e condição não informados"
        }
        open={openSections.principais}
        onToggle={() => toggleSection("principais")}
        onEdit={() => onGoToStep(1)}
      >
        <ReviewDescriptionBlock text={descricao} />
        <ReviewFieldGrid>
          <ReviewDetail label="Título">{titulo || "Não informado"}</ReviewDetail>
          <ReviewDetail label="Publicação">
            <div className="flex flex-wrap gap-2">
              <ReviewBadge variant={condicao === "novo" ? "success" : "neutral"}>
                {condicaoLabel}
              </ReviewBadge>
              <ReviewBadge variant={ativo ? "success" : "warning"}>
                {ativo ? "Ativo na vitrine" : "Inativo na vitrine"}
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
        onEdit={() => onGoToStep(2)}
      >
        <ReviewFieldGrid>
          <ReviewDetail label="Categoria principal">{paiNome ?? "Não informado"}</ReviewDetail>
          <ReviewDetail label="Tipo específico">{subNome ?? "Não informado"}</ReviewDetail>
          <div className="min-w-0 sm:col-span-2">
            <ReviewDetail label="Marca">{marcaNome ?? "Não informado"}</ReviewDetail>
          </div>
        </ReviewFieldGrid>
      </ReviewSectionCard>

      <ReviewSectionCard
        title="Preço e estoque"
        summary={
          promoFmt
            ? `${precoDisplay} · promocional ${promoFmt}`
            : precoDisplay !== "Não informado"
              ? precoDisplay
              : "Preço não informado"
        }
        open={openSections.preco}
        onToggle={() => toggleSection("preco")}
        onEdit={() => onGoToStep(3)}
      >
        <ReviewFieldGrid>
          <ReviewPriceBlock precoLabel={precoDisplay} promoLabel={promoDisplay} />
          <ReviewDetail label="Estoque inicial">{estoqueLabel}</ReviewDetail>
          <ReviewDetail label="SKU">{draft.sku.trim() || "Não informado"}</ReviewDetail>
        </ReviewFieldGrid>
      </ReviewSectionCard>

      <ReviewSectionCard
        title="Imagens"
        summary={
          images.length > 0
            ? `${images.length} ${images.length === 1 ? "imagem" : "imagens"} · capa #${capaIndex + 1}`
            : "Nenhuma imagem selecionada"
        }
        open={openSections.imagens}
        onToggle={() => toggleSection("imagens")}
        onEdit={() => onGoToStep(4)}
      >
        <ProdutoImagesReviewGrid
          imagens={images.map((im) => im.url)}
          coverIndex={capaIndex}
          emptyMessage="Nenhuma foto selecionada"
          emptyHint="Adicione fotos na etapa Imagens."
        />
      </ReviewSectionCard>

      <ReviewSectionCard
        title="Detalhes do produto"
        summary={
          detalhesCount > 0
            ? `${detalhesCount} ${detalhesCount === 1 ? "característica preenchida" : "características preenchidas"}`
            : "Nenhuma característica informada"
        }
        open={openSections.detalhes}
        onToggle={() => toggleSection("detalhes")}
        onEdit={() => onGoToStep(5)}
      >
        {obrigatorios.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Detalhes obrigatórios
            </p>
            <div className="flex flex-wrap gap-2">
              {obrigatorios.map((r) => (
                <span
                  key={r.campo}
                  className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-sm font-medium text-slate-800"
                >
                  {r.campo}: {r.valor}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Características extras
          </p>
          {extras.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {extras.map((r) => (
                <span
                  key={r.id}
                  className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-sm font-medium text-slate-800"
                >
                  {r.campo}: {r.valor}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Nenhuma característica extra informada.</p>
          )}
        </div>
      </ReviewSectionCard>

      <ReviewSectionCard
        title="Dados opcionais"
        summary={
          medidasPreenchidas.length > 0
            ? `${medidasPreenchidas.length} ${medidasPreenchidas.length === 1 ? "medida informada" : "medidas informadas"}`
            : "Nenhuma medida informada"
        }
        open={openSections.medidas}
        onToggle={() => toggleSection("medidas")}
        onEdit={() => onGoToStep(6)}
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
            {draft.comprimento_cm.trim()
              ? `${draft.comprimento_cm.trim()} cm`
              : "Não informado"}
          </ReviewDetail>
        </ReviewFieldGrid>
      </ReviewSectionCard>
    </div>
  );
}
