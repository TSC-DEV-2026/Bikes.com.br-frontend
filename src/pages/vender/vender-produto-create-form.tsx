import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  FolderTree,
  ImagePlus,
  ListChecks,
  Loader2,
  Package,
  Plus,
  Sparkles,
  Tag,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  categoriasRoutes,
  marcasRoutes,
  paths,
  produtosRoutes,
} from "@/api/endpoints";
import { isAxiosError } from "axios";
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
import { venderProdutoSecondaryButtonClass } from "@/pages/vender/vender-produto-editor-utils";
import type { CategoriaPai, Subcategoria } from "@/types/categoria";
import type { Marca } from "@/types/marca";
import {
  isProdutoCondicao,
  PRODUTO_CONDICAO_OPTIONS,
  type ProdutoCondicao,
  type ProdutoCreateMeta,
} from "@/types/produto";
import {
  ProdutoImagesDraftManager,
  PRODUCT_IMAGE_LABEL,
  PRODUCT_IMAGE_TYPE_ERROR,
} from "@/pages/vender/vender-produto-images-manager";
import { validateAndNormalizeProductImageFile } from "@/pages/vender/product-image-validation";

export const INPUT_CLASS =
  "h-11 w-full rounded-xl border border-slate-200/90 bg-white px-4 text-base text-[#0c1b33] shadow-sm shadow-slate-200/40 outline-none transition-all duration-200 placeholder:text-slate-400 md:text-sm focus-visible:border-[#09bc8a] focus-visible:bg-emerald-50/20 focus-visible:ring-2 focus-visible:ring-[#09bc8a]/20 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-50 aria-invalid:border-red-300 aria-invalid:ring-red-100";

export const SELECT_TRIGGER_CLASS =
  "flex h-11 w-full min-w-0 max-w-full items-center justify-between gap-2 rounded-xl border border-slate-200/90 bg-white px-4 text-base text-[#0c1b33] shadow-sm shadow-slate-200/40 outline-none transition-all duration-200 md:text-sm focus-visible:border-[#09bc8a] focus-visible:bg-emerald-50/20 focus-visible:ring-2 focus-visible:ring-[#09bc8a]/20 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-50 data-[size=default]:h-11 [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:truncate";

const MARCA_PLACEHOLDER = "__placeholder__";
const PAI_SENTINEL = "__sem_pai__";
const SUB_USAR_PAI = "__usar_pai__";

type ImageItem = {
  id: string;
  file: File;
  url: string;
};

type IndexadorRow = {
  id: string;
  campo: string;
  valor: string;
};

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
    <section className="w-full min-w-0 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md sm:p-7">
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
        <span
          aria-hidden
          className="mt-1 hidden h-2 w-14 shrink-0 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 sm:block"
        />
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function ResumoCheckRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-start gap-2.5 text-sm">
      <span
        className={cn("mt-1.5 size-2 shrink-0 rounded-full", ok ? "bg-emerald-500" : "bg-slate-200")}
        aria-hidden
      />
      <span className={cn("leading-snug", ok ? "font-medium text-slate-800" : "text-slate-500")}>
        {label}
      </span>
    </li>
  );
}

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

function parseMoneyBr(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const normalized = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  const n = Number.parseFloat(normalized);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function parseOptionalInt(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
}

function parseOptionalNumber(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const normalized = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}

function parseCreatedProdutoId(data: unknown): number | null {
  const pick = (v: unknown): number | null => {
    if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
    if (typeof v === "string" && v.trim()) {
      const n = Number.parseInt(v, 10);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };

  if (data == null) return null;
  if (typeof data !== "object") return pick(data);

  const o = data as Record<string, unknown>;
  const direct = pick(o.id ?? o.produto_id);
  if (direct != null) return direct;

  for (const key of ["data", "produto", "item", "result"] as const) {
    const inner = o[key];
    if (inner && typeof inner === "object") {
      const id = pick((inner as Record<string, unknown>).id);
      if (id != null) return id;
    }
  }
  return null;
}

function newIndexadorRow(): IndexadorRow {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    campo: "",
    valor: "",
  };
}

function newImageId(): string {
  return `img-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export type VenderProdutoCreateFormProps = {
  disabled?: boolean;
  /** Chamado uma vez quando GET categorias pai + GET marcas finalizam (sucesso ou erro). */
  onCatalogBootstrapComplete?: (info: { error: string | null }) => void;
};

export function VenderProdutoCreateForm({
  disabled = false,
  onCatalogBootstrapComplete,
}: VenderProdutoCreateFormProps) {
  const navigate = useNavigate();

  const [categoriasPai, setCategoriasPai] = useState<CategoriaPai[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [paiIdStr, setPaiIdStr] = useState("");
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([]);
  const [subcategoriaIdStr, setSubcategoriaIdStr] = useState("");
  const [subsLoading, setSubsLoading] = useState(false);

  const [newSubNome, setNewSubNome] = useState("");
  const [newSubSlug, setNewSubSlug] = useState("");
  const [creatingSub, setCreatingSub] = useState(false);

  const [marcaIdStr, setMarcaIdStr] = useState(MARCA_PLACEHOLDER);
  const [showMarcaForm, setShowMarcaForm] = useState(false);
  const [newMarcaNome, setNewMarcaNome] = useState("");
  const [newMarcaSlug, setNewMarcaSlug] = useState("");
  const [newMarcaDescricao, setNewMarcaDescricao] = useState("");
  const [newMarcaLogo, setNewMarcaLogo] = useState<File | null>(null);
  const [creatingMarca, setCreatingMarca] = useState(false);
  const [marcaFormError, setMarcaFormError] = useState<string | null>(null);

  const [titulo, setTitulo] = useState("");
  const [slug, setSlug] = useState("");
  const [descricao, setDescricao] = useState("");
  const [preco, setPreco] = useState("");
  const [precoPromocional, setPrecoPromocional] = useState("");
  const [condicao, setCondicao] = useState<ProdutoCondicao>("novo");

  const [images, setImages] = useState<ImageItem[]>([]);
  const [principalId, setPrincipalId] = useState<string | null>(null);

  const [indexadorRows, setIndexadorRows] = useState<IndexadorRow[]>([newIndexadorRow()]);

  const [sku, setSku] = useState("");
  const [pesoGramas, setPesoGramas] = useState("");
  const [alturaCm, setAlturaCm] = useState("");
  const [larguraCm, setLarguraCm] = useState("");
  const [comprimentoCm, setComprimentoCm] = useState("");
  const [estoqueInicial, setEstoqueInicial] = useState("");
  const [ativo, setAtivo] = useState(true);

  const [submitting, setSubmitting] = useState(false);

  const imagesRef = useRef<ImageItem[]>([]);
  imagesRef.current = images;


  useEffect(() => {
    return () => {
      for (const im of imagesRef.current) {
        try {
          URL.revokeObjectURL(im.url);
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const fieldDisabled = disabled || submitting;

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
        const [paiList, marcasList] = await Promise.all([
          categoriasRoutes.getCategoriasPai(),
          marcasRoutes.getMarcas(),
        ]);
        if (!cancelled) {
          setCategoriasPai(paiList);
          setMarcas(marcasList);
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
  }, []);

  const onCatalogBootstrapCompleteRef = useRef(onCatalogBootstrapComplete);
  onCatalogBootstrapCompleteRef.current = onCatalogBootstrapComplete;
  const wasCatalogLoadingRef = useRef(true);
  useEffect(() => {
    if (wasCatalogLoadingRef.current && !catalogLoading) {
      onCatalogBootstrapCompleteRef.current?.({ error: catalogError });
    }
    wasCatalogLoadingRef.current = catalogLoading;
  }, [catalogLoading, catalogError]);

  useEffect(() => {
    setSubcategoriaIdStr("");
    if (!paiIdStr) {
      setSubcategorias([]);
      return;
    }
    const paiNum = Number.parseInt(paiIdStr, 10);
    if (!Number.isFinite(paiNum)) return;

    let cancelled = false;
    setSubsLoading(true);
    void categoriasRoutes
      .getMinhasSubcategorias({ categoria_pai_id: paiNum, ativo: true })
      .then((subs) => {
        if (!cancelled) setSubcategorias(subs);
      })
      .catch((e) => {
        if (!cancelled) {
          toast.error(getAxiosErrorMessage(e, "Não foi possível carregar subcategorias."));
          setSubcategorias([]);
        }
      })
      .finally(() => {
        if (!cancelled) setSubsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [paiIdStr]);

  const resumoPainel = useMemo(() => {
    const marcaNum =
      marcaIdStr && marcaIdStr !== MARCA_PLACEHOLDER
        ? Number.parseInt(marcaIdStr, 10)
        : NaN;
    const marcaSelecionada =
      Number.isFinite(marcaNum) ? marcas.find((m) => m.id === marcaNum) : undefined;

    const precoParse = parseMoneyBr(preco);
    const caracteristicasCount = indexadorRows.filter((r) => r.valor.trim()).length;

    const categoriaNome = paiIdStr
      ? categoriasPai.find((c) => String(c.id) === paiIdStr)?.nome ?? "—"
      : "—";

    let subNome: string | null = null;
    if (paiIdStr && subcategoriaIdStr && subcategoriaIdStr !== SUB_USAR_PAI) {
      const sid = Number.parseInt(subcategoriaIdStr, 10);
      if (Number.isFinite(sid)) {
        subNome = subcategorias.find((s) => s.id === sid)?.nome ?? null;
      }
    }

    const dadosPrincipaisOk =
      Boolean(titulo.trim()) && Boolean(descricao.trim()) && precoParse != null;
    const categoriaOk = Boolean(paiIdStr);
    const marcaOk =
      Boolean(marcaIdStr) &&
      marcaIdStr !== MARCA_PLACEHOLDER &&
      Number.isFinite(marcaNum) &&
      marcas.some((m) => m.id === marcaNum);

    return {
      categoriaNome,
      subNome,
      marcaNome: marcaSelecionada?.nome ?? null,
      precoParse,
      caracteristicasCount,
      dadosPrincipaisOk,
      categoriaOk,
      marcaOk,
      imagensCount: images.length,
    };
  }, [
    categoriasPai,
    descricao,
    images.length,
    indexadorRows,
    marcaIdStr,
    marcas,
    paiIdStr,
    preco,
    subcategoriaIdStr,
    subcategorias,
    titulo,
  ]);

  const principalIndex = useMemo(() => {
    if (!images.length) return 0;
    if (principalId) {
      const i = images.findIndex((im) => im.id === principalId);
      if (i >= 0) return i;
    }
    return 0;
  }, [images, principalId]);

  useEffect(() => {
    if (images.length && !principalId) {
      setPrincipalId(images[0].id);
    }
    if (images.length === 0) {
      setPrincipalId(null);
    }
  }, [images, principalId]);

  const revokeUrls = useCallback((items: ImageItem[]) => {
    for (const im of items) {
      try {
        URL.revokeObjectURL(im.url);
      } catch {
        // ignore
      }
    }
  }, []);

  const handleFilesSelected = (fileList: FileList | null) => {
    if (!fileList?.length) return;

    const accepted: File[] = [];
    for (let i = 0; i < fileList.length; i += 1) {
      const file = fileList.item(i);
      if (file) accepted.push(file);
    }
    if (!accepted.length) return;

    const next: ImageItem[] = accepted.map((file) => ({
      id: newImageId(),
      file,
      url: URL.createObjectURL(file),
    }));

    setImages((prev) => [...prev, ...next]);
    if (images.length === 0 && next[0]) {
      setPrincipalId(next[0].id);
    }
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const found = prev.find((p) => p.id === id);
      if (found) revokeUrls([found]);
      const rest = prev.filter((p) => p.id !== id);
      if (principalId === id && rest[0]) {
        setPrincipalId(rest[0].id);
      }
      return rest;
    });
  };

  const validate = (): string | null => {
    if (catalogError || catalogLoading) return "Aguarde o carregamento do catálogo.";
    if (!paiIdStr) return "Selecione a categoria principal.";
    const tituloOk = titulo.trim();
    if (!tituloOk) return "Informe o título do produto.";
    if (!descricao.trim()) return "Informe a descrição.";
    const precoNum = parseMoneyBr(preco);
    if (precoNum == null) return "Informe um preço válido.";
    const estoqueNum = parseOptionalInt(estoqueInicial);
    if (estoqueInicial.trim() && (estoqueNum == null || estoqueNum < 0)) {
      return "Informe um estoque inicial válido (maior ou igual a zero).";
    }
    if (images.length > 0 && (principalIndex < 0 || principalIndex >= images.length)) {
      return "Selecione uma imagem principal válida.";
    }
    const slugT = slug.trim();
    if (slugT && !/^[-a-z0-9]+$/i.test(slugT)) {
      return "Slug inválido: use letras minúsculas, números e hífens.";
    }
    if (!marcaIdStr || marcaIdStr === MARCA_PLACEHOLDER) {
      return "Selecione ou crie uma marca antes de cadastrar o produto.";
    }
    const marcaNum = Number.parseInt(marcaIdStr, 10);
    if (!Number.isFinite(marcaNum) || !marcas.some((m) => m.id === marcaNum)) {
      return "Selecione uma marca válida.";
    }
    return null;
  };

  const buildMeta = (): ProdutoCreateMeta | null => {
    const err = validate();
    if (err) {
      toast.error(err);
      return null;
    }
    const paiNum = Number.parseInt(paiIdStr, 10);
    const categoriaId =
      subcategoriaIdStr && subcategoriaIdStr !== SUB_USAR_PAI
        ? Number.parseInt(subcategoriaIdStr, 10)
        : paiNum;

    const precoNum = parseMoneyBr(preco)!;
    const prom = parseMoneyBr(precoPromocional);

    const indexadores = indexadorRows
      .map((r) => ({
        campo: (r.campo.trim() || "geral").toLowerCase(),
        valor: r.valor.trim(),
      }))
      .filter((r) => r.valor.length > 0);

    const marcaNum = Number.parseInt(marcaIdStr, 10);

    const meta: ProdutoCreateMeta = {
      categoria_id: categoriaId,
      marca_id: marcaNum,
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      preco: precoNum,
      condicao,
      ...(images.length > 0 ? { imagem_principal_index: principalIndex } : {}),
      indexadores: indexadores.length ? indexadores : undefined,
      ativo,
    };

    const slugFinal = slug.trim() || slugify(titulo);
    if (slugFinal) meta.slug = slugFinal;

    if (prom != null) meta.preco_promocional = prom;
    const skuT = sku.trim();
    if (skuT) meta.sku = skuT;

    const pg = parseOptionalInt(pesoGramas);
    if (pg != null) meta.peso_gramas = pg;
    const a = parseOptionalNumber(alturaCm);
    if (a != null) meta.altura_cm = a;
    const l = parseOptionalNumber(larguraCm);
    if (l != null) meta.largura_cm = l;
    const c = parseOptionalNumber(comprimentoCm);
    if (c != null) meta.comprimento_cm = c;
    const est = parseOptionalInt(estoqueInicial);
    meta.estoque_inicial = est != null && est >= 0 ? est : 0;

    return meta;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (fieldDisabled) return;

    const meta = buildMeta();
    if (!meta) return;

    const normalizedImages: File[] = [];
    const invalidNames: string[] = [];
    for (const im of images) {
      const normalized = await validateAndNormalizeProductImageFile(im.file);
      if (normalized) normalizedImages.push(normalized);
      else invalidNames.push(im.file.name);
    }
    if (invalidNames.length > 0) {
      toast.error(
        `${PRODUCT_IMAGE_TYPE_ERROR} Remova ou substitua: ${invalidNames.join(", ")}.`,
      );
      return;
    }

    const imagens = normalizedImages.length > 0 ? normalizedImages : undefined;

    setSubmitting(true);
    try {
      const res = await produtosRoutes.createProdutoMultipart({ meta, imagens });
      const id = parseCreatedProdutoId(res.data);
      toast.success("Produto cadastrado com sucesso.");
      if (id != null) {
        navigate(`/produtos/${id}`, { replace: false });
      } else {
        navigate(paths.minhaLoja(), { replace: false });
      }
    } catch (err) {
      toast.error(getAxiosErrorMessage(err, "Não foi possível cadastrar o produto."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateMarca = async () => {
    if (fieldDisabled) return;

    const nome = newMarcaNome.trim();
    const slugM = newMarcaSlug.trim();
    const descricaoM = newMarcaDescricao.trim();

    if (!nome) {
      setMarcaFormError("Informe o nome da marca.");
      return;
    }
    if (!slugM) {
      setMarcaFormError("Informe o slug da marca.");
      return;
    }
    if (!/^[-a-z0-9]+$/i.test(slugM)) {
      setMarcaFormError("Slug inválido: use letras, números e hífens.");
      return;
    }
    if (!descricaoM) {
      setMarcaFormError("Informe a descrição da marca.");
      return;
    }
    if (!newMarcaLogo) {
      setMarcaFormError("Envie a logo da marca.");
      return;
    }
    if (!newMarcaLogo.type.startsWith("image/")) {
      setMarcaFormError("A logo deve ser um arquivo de imagem.");
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
      setMarcaIdStr(String(created.id));
      setNewMarcaNome("");
      setNewMarcaSlug("");
      setNewMarcaDescricao("");
      setNewMarcaLogo(null);
      setShowMarcaForm(false);
      toast.success("Marca criada e selecionada.");
    } catch (err) {
      if (isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 409) {
          setMarcaFormError(
            "Já existe uma marca com esse slug. Tente outro identificador.",
          );
          return;
        }
        if (status === 503) {
          setMarcaFormError(
            "Não foi possível enviar a logo agora. Tente novamente em instantes.",
          );
          return;
        }
      }
      setMarcaFormError(getAxiosErrorMessage(err, "Não foi possível criar a marca."));
    } finally {
      setCreatingMarca(false);
    }
  };

  const handleCreateSubcategoria = async () => {
    if (fieldDisabled || !paiIdStr) {
      toast.error("Selecione a categoria principal antes de criar uma subcategoria.");
      return;
    }
    const nome = newSubNome.trim();
    if (!nome) {
      toast.error("Informe o nome da subcategoria.");
      return;
    }
    const paiNum = Number.parseInt(paiIdStr, 10);
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
      setSubcategoriaIdStr(String(created.id));
      setNewSubNome("");
      setNewSubSlug("");
      toast.success("Subcategoria criada.");
    } catch (err) {
      toast.error(getAxiosErrorMessage(err, "Não foi possível criar a subcategoria."));
    } finally {
      setCreatingSub(false);
    }
  };

  const mensagemResumoPublicacao = validate();

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="mx-auto w-full pb-6"
      aria-busy={submitting}
    >
      {catalogError ? (
        <div
          role="alert"
          className="mb-6 rounded-2xl border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-900"
        >
          {catalogError}
        </div>
      ) : null}

      <div className="grid w-full min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-8">
        <div className="min-w-0 w-full">
          <FormSection
            icon={Package}
            title="Dados principais"
            description="Título, preço e descrição são obrigatórios para publicar o anúncio com qualidade."
          >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="produto-titulo" className="text-sm font-medium text-slate-800">
              Título
            </Label>
            <Input
              id="produto-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              disabled={fieldDisabled || catalogLoading}
              className={INPUT_CLASS}
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="produto-preco" className="text-sm font-medium text-slate-800">
              Preço (R$)
            </Label>
            <Input
              id="produto-preco"
              inputMode="decimal"
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
              disabled={fieldDisabled || catalogLoading}
              placeholder="ex.: 1299,90"
              className={INPUT_CLASS}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="produto-condicao" className="text-sm font-medium text-slate-800">
              Condição
            </Label>
            <Select
              value={condicao}
              onValueChange={(v) => {
                if (isProdutoCondicao(v)) setCondicao(v);
              }}
              disabled={fieldDisabled || catalogLoading}
            >
              <SelectTrigger id="produto-condicao" className={cn(SELECT_TRIGGER_CLASS)}>
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
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="produto-descricao" className="text-sm font-medium text-slate-800">
              Descrição
            </Label>
            <textarea
              id="produto-descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              disabled={fieldDisabled || catalogLoading}
              rows={9}
              className={cn(
                INPUT_CLASS,
                "h-auto min-h-[220px] resize-y py-3 transition-colors duration-150 md:min-h-[280px]",
              )}
            />
          </div>
        </div>
      </FormSection>
        </div>

        <aside className="min-w-0 w-full lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800/90">
              Visão rápida
            </p>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">Resumo do anúncio</h3>
            <p className="mt-1 text-sm text-slate-600">
              Acompanhe o preenchimento com base nos mesmos requisitos do envio atual.
            </p>

            <ul className="mt-6 space-y-3">
              <ResumoCheckRow
                ok={resumoPainel.dadosPrincipaisOk}
                label="Dados principais (título, descrição e preço válido)"
              />
              <ResumoCheckRow
                ok={resumoPainel.categoriaOk}
                label="Categoria principal definida"
              />
              <ResumoCheckRow ok={resumoPainel.marcaOk} label="Marca válida escolhida" />
              <ResumoCheckRow
                ok={resumoPainel.imagensCount > 0}
                label={
                  resumoPainel.imagensCount > 0
                    ? `Imagens adicionadas (${resumoPainel.imagensCount})`
                    : "Imagens (opcional neste fluxo)"
                }
              />
              <ResumoCheckRow
                ok={resumoPainel.caracteristicasCount > 0}
                label={
                  resumoPainel.caracteristicasCount > 0
                    ? `Características com valor (${resumoPainel.caracteristicasCount})`
                    : "Características (opcional até preencher valores)"
                }
              />
            </ul>

            <dl className="mt-6 space-y-3 border-t border-slate-100 pt-6 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Preço atual
                </dt>
                <dd className="mt-1 text-base font-semibold text-slate-900">
                  {resumoPainel.precoParse != null
                    ? new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(resumoPainel.precoParse)
                    : preco.trim()
                      ? preco.trim()
                      : "Informe um valor válido"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Categoria
                </dt>
                <dd className="mt-1 font-medium text-slate-800">{resumoPainel.categoriaNome}</dd>
                <dd className="text-xs leading-relaxed text-slate-500">
                  Subcategoria: {resumoPainel.subNome ?? "somente categoria principal"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Marca
                </dt>
                <dd className="mt-1 font-medium text-slate-800">{resumoPainel.marcaNome ?? "—"}</dd>
              </div>
            </dl>

            {mensagemResumoPublicacao ? (
              <div
                role="status"
                className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950"
              >
                <strong className="font-semibold">Atenção antes de enviar:</strong>{" "}
                <span className="leading-relaxed">{mensagemResumoPublicacao}</span>
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      <div className="mt-6 grid w-full min-w-0 gap-6">
      <FormSection
        icon={FolderTree}
        title="Categoria do anúncio"
        description="Primeiro escolha a categoria principal. Depois refine com uma subcategoria opcional da sua loja ou crie uma nova."
      >
        <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800/90">
            Obrigatório
          </p>
          <div className="mt-4 space-y-2">
            <Label htmlFor="produto-cat-pai" className="text-sm font-medium text-slate-800">
              Categoria principal
            </Label>
            <Select
              value={paiIdStr || PAI_SENTINEL}
              onValueChange={(v) => {
                const next = v === PAI_SENTINEL ? "" : v;
                setPaiIdStr(next);
              }}
              disabled={fieldDisabled || catalogLoading}
            >
              <SelectTrigger id="produto-cat-pai" className={cn(SELECT_TRIGGER_CLASS)}>
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
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Opcional</p>
          <div className="mt-4 space-y-2">
            <Label htmlFor="produto-sub" className="text-sm font-medium text-slate-800">
              Subcategoria
            </Label>
            <Select
              value={subcategoriaIdStr ? subcategoriaIdStr : SUB_USAR_PAI}
              onValueChange={(v) => {
                setSubcategoriaIdStr(v === SUB_USAR_PAI ? "" : v);
              }}
              disabled={fieldDisabled || catalogLoading || !paiIdStr || subsLoading}
            >
              <SelectTrigger id="produto-sub" className={cn(SELECT_TRIGGER_CLASS)}>
                <SelectValue
                  placeholder={subsLoading ? "Carregando…" : "Usar categoria principal"}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SUB_USAR_PAI}>
                  Usar apenas a categoria principal
                </SelectItem>
                {subcategorias.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs leading-relaxed text-slate-500">
              Sem subcategoria, o anúncio usa automaticamente o id da <strong>categoria principal</strong>{" "}
              selecionada acima.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-dashed border-emerald-200/80 bg-gradient-to-br from-emerald-50/40 via-white to-slate-50/40 p-4 shadow-inner sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-900">Criar nova subcategoria</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                Ela ficará na sua loja, vinculada à <span className="font-medium">categoria principal</span>{" "}
                atual.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nova-sub-nome" className="text-xs font-medium text-slate-700">
                Nome
              </Label>
              <Input
                id="nova-sub-nome"
                value={newSubNome}
                onChange={(e) => setNewSubNome(e.target.value)}
                disabled={fieldDisabled || !paiIdStr || creatingSub}
                className={INPUT_CLASS}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nova-sub-slug" className="text-xs font-medium text-slate-700">
                Slug (opcional)
              </Label>
              <Input
                id="nova-sub-slug"
                value={newSubSlug}
                onChange={(e) => setNewSubSlug(e.target.value)}
                disabled={fieldDisabled || !paiIdStr || creatingSub}
                placeholder="ex.: downhill"
                className={INPUT_CLASS}
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={fieldDisabled || !paiIdStr || creatingSub}
              onClick={() => void handleCreateSubcategoria()}
            >
              {creatingSub ? (
                <>
                  <Loader2 className="mr-2 size-4 shrink-0 animate-spin" aria-hidden />
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
        </div>
      </FormSection>

      <FormSection
        icon={Tag}
        title="Marca"
        description="Seleção obrigatória para publicar — escolha uma marca já cadastrada ou registre uma nova para a sua vitrine."
      >
        <div className="rounded-2xl border border-amber-100 bg-amber-50/50 px-4 py-3 text-sm text-amber-950">
          <strong className="font-semibold">Atenção:</strong> a marca aparece junto ao título nas buscas
          e nos detalhes do produto. Sem ela, o envio não é concluído.
        </div>

        <div className="space-y-2">
          <Label htmlFor="produto-marca" className="text-sm font-medium text-slate-800">
            Marca <span className="text-destructive">*</span>
          </Label>
          <Select
            value={marcaIdStr}
            onValueChange={setMarcaIdStr}
            disabled={fieldDisabled || catalogLoading}
          >
            <SelectTrigger id="produto-marca" className={cn(SELECT_TRIGGER_CLASS)}>
              <SelectValue placeholder="Selecione uma marca" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={MARCA_PLACEHOLDER} disabled>
                Selecione uma marca
              </SelectItem>
              {marcas.map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>
                  {m.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          type="button"
          variant="outline"
          className="inline-flex h-auto items-center justify-start gap-2 rounded-2xl border-emerald-200 bg-emerald-50/60 px-4 py-3 text-left text-emerald-900 shadow-sm hover:border-emerald-300 hover:bg-emerald-50"
          disabled={fieldDisabled || catalogLoading}
          onClick={() => {
            setShowMarcaForm((v) => !v);
            setMarcaFormError(null);
          }}
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-inner">
            <Plus className="size-5" aria-hidden />
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-sm font-semibold leading-snug">
              Não encontrou a sua marca?
            </span>
            <span className="text-xs font-normal text-emerald-800/90">
              {showMarcaForm
                ? "Fechar o fluxo de criação de marca"
                : "Abrir cadastro rápido e deixar selecionada ao salvar"}
            </span>
          </span>
        </Button>

        {showMarcaForm ? (
          <div className="mt-2 space-y-4 rounded-2xl border border-slate-200 bg-slate-50/40 p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">Nova marca</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="marca-nome">Nome da marca</Label>
                <Input
                  id="marca-nome"
                  value={newMarcaNome}
                  onChange={(e) => setNewMarcaNome(e.target.value)}
                  disabled={creatingMarca}
                  className={INPUT_CLASS}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="marca-slug">Slug</Label>
                <Input
                  id="marca-slug"
                  value={newMarcaSlug}
                  onChange={(e) => setNewMarcaSlug(e.target.value)}
                  disabled={creatingMarca}
                  placeholder="ex.: caloi"
                  className={INPUT_CLASS}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="marca-descricao">Descrição</Label>
                <textarea
                  id="marca-descricao"
                  value={newMarcaDescricao}
                  onChange={(e) => setNewMarcaDescricao(e.target.value)}
                  disabled={creatingMarca}
                  rows={3}
                  className={cn(INPUT_CLASS, "min-h-24 resize-y py-3")}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="marca-logo">Logo</Label>
                <Input
                  id="marca-logo"
                  type="file"
                  accept="image/*"
                  disabled={creatingMarca}
                  className={cn(INPUT_CLASS, "h-auto py-2")}
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setNewMarcaLogo(file);
                    e.target.value = "";
                  }}
                />
                {newMarcaLogo ? (
                  <p className="text-xs text-slate-600">Arquivo: {newMarcaLogo.name}</p>
                ) : (
                  <p className="text-xs text-slate-500">PNG, JPG ou WEBP.</p>
                )}
              </div>
            </div>
            {marcaFormError ? (
              <p className="text-sm text-destructive" role="alert">
                {marcaFormError}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={creatingMarca}
                onClick={() => void handleCreateMarca()}
              >
                {creatingMarca ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                    Criando marca…
                  </>
                ) : (
                  "Criar marca"
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={creatingMarca}
                onClick={() => {
                  setShowMarcaForm(false);
                  setMarcaFormError(null);
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : null}
      </FormSection>

      <FormSection
        icon={ImagePlus}
        title="Imagens"
        description="Boas fotos aumentam conversão. Envie várias imagens e escolha a capa principal do anúncio."
      >
        <ProdutoImagesDraftManager
          images={images}
          principalId={principalId}
          setPrincipalId={setPrincipalId}
          handleFilesSelected={handleFilesSelected}
          removeImage={removeImage}
          disabled={fieldDisabled}
          inputId="produto-imagens"
        />
      </FormSection>

      <FormSection
        icon={ListChecks}
        title="Características"
        description='Detalhes técnicos e refinamentos de busca (ex.: tamanho do quadro, grupo). Campo sem nome usa "geral".'
      >
        <div className="space-y-4">
          {indexadorRows.map((row, idx) => (
            <div
              key={row.id}
              className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/40 p-4 sm:grid-cols-[1fr_1fr_auto] sm:p-5"
            >
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Campo
                </Label>
                <Input
                  value={row.campo}
                  onChange={(e) => {
                    const v = e.target.value;
                    setIndexadorRows((prev) =>
                      prev.map((r) => (r.id === row.id ? { ...r, campo: v } : r)),
                    );
                  }}
                  disabled={fieldDisabled}
                  placeholder="ex.: aro"
                  className={INPUT_CLASS}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Valor
                </Label>
                <Input
                  value={row.valor}
                  onChange={(e) => {
                    const v = e.target.value;
                    setIndexadorRows((prev) =>
                      prev.map((r) => (r.id === row.id ? { ...r, valor: v } : r)),
                    );
                  }}
                  disabled={fieldDisabled}
                  placeholder="ex.: 29"
                  className={INPUT_CLASS}
                />
              </div>
              <div className="flex items-end justify-end sm:justify-start">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0 rounded-xl border-slate-200"
                  disabled={fieldDisabled || indexadorRows.length <= 1}
                  onClick={() =>
                    setIndexadorRows((prev) =>
                      prev.length <= 1 ? prev : prev.filter((r) => r.id !== row.id),
                    )
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
            className="rounded-2xl"
            disabled={fieldDisabled}
            onClick={() => setIndexadorRows((prev) => [...prev, newIndexadorRow()])}
          >
            <Plus className="mr-2 size-4" aria-hidden />
            Adicionar característica
          </Button>
        </div>
      </FormSection>

      <FormSection
        icon={Sparkles}
        title="Dados opcionais"
        description="Informações extras de vitrine e logística — preencha apenas o que fizer sentido para o seu estoque."
      >
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Operação</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="produto-slug" className="text-sm font-medium text-slate-800">
                  Slug (opcional)
                </Label>
                <Input
                  id="produto-slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  disabled={fieldDisabled}
                  placeholder="Gerado a partir do título se vazio"
                  className={INPUT_CLASS}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="produto-preco-promo" className="text-sm font-medium text-slate-800">
                  Preço promocional (opcional)
                </Label>
                <Input
                  id="produto-preco-promo"
                  inputMode="decimal"
                  value={precoPromocional}
                  onChange={(e) => setPrecoPromocional(e.target.value)}
                  disabled={fieldDisabled}
                  className={INPUT_CLASS}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="produto-sku" className="text-sm font-medium text-slate-800">
                  SKU (opcional)
                </Label>
                <Input
                  id="produto-sku"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  disabled={fieldDisabled}
                  className={INPUT_CLASS}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="produto-estoque" className="text-sm font-medium text-slate-800">
                  Estoque inicial (opcional)
                </Label>
                <Input
                  id="produto-estoque"
                  inputMode="numeric"
                  value={estoqueInicial}
                  onChange={(e) => setEstoqueInicial(e.target.value)}
                  disabled={fieldDisabled}
                  className={INPUT_CLASS}
                />
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:col-span-2">
                <Checkbox
                  id="produto-ativo"
                  checked={ativo}
                  onCheckedChange={(c) => setAtivo(c === true)}
                  disabled={fieldDisabled}
                />
                <Label htmlFor="produto-ativo" className="text-sm font-medium text-slate-800">
                  Produto ativo na vitrine
                </Label>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Medidas</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="produto-peso" className="text-sm font-medium text-slate-800">
                  Peso (g, opcional)
                </Label>
                <Input
                  id="produto-peso"
                  inputMode="numeric"
                  value={pesoGramas}
                  onChange={(e) => setPesoGramas(e.target.value)}
                  disabled={fieldDisabled}
                  className={INPUT_CLASS}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="produto-alt" className="text-sm font-medium text-slate-800">
                  Altura (cm)
                </Label>
                <Input
                  id="produto-alt"
                  inputMode="decimal"
                  value={alturaCm}
                  onChange={(e) => setAlturaCm(e.target.value)}
                  disabled={fieldDisabled}
                  className={INPUT_CLASS}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="produto-larg" className="text-sm font-medium text-slate-800">
                  Largura (cm)
                </Label>
                <Input
                  id="produto-larg"
                  inputMode="decimal"
                  value={larguraCm}
                  onChange={(e) => setLarguraCm(e.target.value)}
                  disabled={fieldDisabled}
                  className={INPUT_CLASS}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="produto-comp" className="text-sm font-medium text-slate-800">
                  Comprimento (cm)
                </Label>
                <Input
                  id="produto-comp"
                  inputMode="decimal"
                  value={comprimentoCm}
                  onChange={(e) => setComprimentoCm(e.target.value)}
                  disabled={fieldDisabled}
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          </div>
        </div>
      </FormSection>

        <div className="min-w-0 w-full">
          <div className="sticky bottom-0 z-10 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-white/85 sm:flex-row sm:justify-end lg:rounded-3xl lg:p-5">
            <Button
              type="button"
              variant="outline"
              className={cn(
                "w-full shrink-0 sm:w-auto lg:order-1",
                venderProdutoSecondaryButtonClass,
              )}
              disabled={submitting}
              onClick={() => navigate(paths.minhaLoja())}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={fieldDisabled || catalogLoading}
              className="w-full shrink-0 bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto sm:min-w-[200px] lg:order-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 size-4 shrink-0 animate-spin" aria-hidden />
                  Publicando…
                </>
              ) : (
                "Cadastrar produto"
              )}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
