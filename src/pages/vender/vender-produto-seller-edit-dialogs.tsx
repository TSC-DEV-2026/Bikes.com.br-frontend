import { useCallback, useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import { X } from "lucide-react";
import { toast } from "sonner";

import * as categoriasRoutes from "@/api/endpoints/categorias.routes";
import * as marcasRoutes from "@/api/endpoints/marcas.routes";
import * as produtosRoutes from "@/api/endpoints/produtos.routes";
import type { ProdutoUpdatePayload } from "@/api/endpoints/produtos.routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAxiosErrorMessage } from "@/lib/api-error";
import { notifySuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { CategoriaPai, Subcategoria } from "@/types/categoria";
import type { Marca } from "@/types/marca";
import type {
  ProdutoDetalheView,
  ProdutoIndexadorView,
  ProdutoSellerEditFormValues,
} from "@/types/produto";
import { isProdutoCondicao, PRODUTO_CONDICAO_OPTIONS } from "@/types/produto";
import {
  extractCategoriaMarcaIds,
  extractProdutoOpcionaisFromPayload,
} from "@/types/produto";
import { PRODUCT_MAX_ACTIVE_IMAGES } from "@/pages/vender/product-image-validation";
import {
  notifyRejectedProductImageFiles,
  partitionProductImageFilesAsync,
  PRODUCT_IMAGE_ACCEPT,
} from "@/pages/vender/vender-produto-images-manager";

function notifyProductActiveImageLimitReached(): string {
  const description = `O anúncio pode ter no máximo ${PRODUCT_MAX_ACTIVE_IMAGES} fotos ativas.`;
  toast.error("Limite de fotos atingido", { description });
  return description;
}

function exceedsProductActiveImageLimit(activeCount: number, newCount: number): boolean {
  return activeCount + newCount > PRODUCT_MAX_ACTIVE_IMAGES;
}

export type SellerEditDialogId =
  | "principais"
  | "opcionais"
  | "ativo"
  | "categoria"
  | "marca"
  | "caracteristicas"
  | "imagens";

const SUB_USAR_PAI = "__usar_pai__";

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseMoneyBr(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function parseOptionalNonNegInt(raw: string): number | null | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  const n = Number.parseInt(t.replace(",", "."), 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function parseOptionalNonNegNumber(raw: string): number | null | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  const n = Number(t.replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function DialogFrame({
  title,
  children,
  footer,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="relative max-h-[90vh] w-full min-w-0 max-w-lg overflow-y-auto overflow-x-hidden rounded-2xl bg-white p-4 shadow-xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground sm:right-4 sm:top-4"
          onClick={onClose}
          aria-label="Fechar"
        >
          <X className="size-4" aria-hidden />
        </button>
        <h2 className="break-words pr-10 text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        <div className="mt-4 min-w-0 space-y-4">{children}</div>
        <div className="mt-6 flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end sm:[&>button]:w-auto [&>button]:w-full">
          {footer}
        </div>
      </div>
    </div>
  );
}

function PrincipaisDialog({
  productId,
  form,
  onClose,
  onSaved,
}: {
  productId: string;
  form: ProdutoSellerEditFormValues;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [titulo, setTitulo] = useState(form.titulo);
  const [descricao, setDescricao] = useState(form.descricao);
  const [preco, setPreco] = useState(form.preco);
  const [precoPromo, setPrecoPromo] = useState(form.preco_promocional);
  const [condicao, setCondicao] = useState(form.condicao);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitulo(form.titulo);
    setDescricao(form.descricao);
    setPreco(form.preco);
    setPrecoPromo(form.preco_promocional);
    setCondicao(form.condicao);
  }, [form]);

  const save = async () => {
    setError(null);
    const t = titulo.trim();
    const d = descricao.trim();
    if (!t) {
      setError("Informe um título.");
      return;
    }
    if (!d) {
      setError("Informe uma descrição.");
      return;
    }
    const precoN = parseMoneyBr(preco);
    if (precoN == null || precoN < 0) {
      setError("Informe um preço válido (maior ou igual a zero).");
      return;
    }
    let preco_promocional: number | null | undefined;
    const promoRaw = precoPromo.trim();
    if (!promoRaw) {
      preco_promocional = null;
    } else {
      const p = parseMoneyBr(promoRaw);
      if (p == null || p < 0) {
        setError("Preço promocional inválido ou deixe em branco.");
        return;
      }
      preco_promocional = p;
    }

    setSaving(true);
    try {
      await produtosRoutes.updateProduto(productId, {
        titulo: t,
        descricao: d,
        preco: precoN,
        preco_promocional,
        condicao,
      });
      notifySuccess("Dados salvos", "As informações principais foram atualizadas.");
      await onSaved();
      onClose();
    } catch (err) {
      setError(getAxiosErrorMessage(err, "Não foi possível salvar."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogFrame
      title="Editar dados principais"
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </>
      }
    >
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="dlg-pri-titulo">Título</Label>
        <Input id="dlg-pri-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="dlg-pri-desc">Descrição</Label>
        <textarea
          id="dlg-pri-desc"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          className={cn(
            "min-h-[140px] w-full resize-y rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-sm",
            "focus-visible:ring-2 focus-visible:ring-emerald-100 focus-visible:outline-none",
          )}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="dlg-pri-preco">Preço (R$)</Label>
          <Input
            id="dlg-pri-preco"
            inputMode="decimal"
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dlg-pri-promo">Preço promocional</Label>
          <Input
            id="dlg-pri-promo"
            inputMode="decimal"
            value={precoPromo}
            onChange={(e) => setPrecoPromo(e.target.value)}
            placeholder="Opcional"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="dlg-pri-cond">Condição</Label>
        <select
          id="dlg-pri-cond"
          value={condicao}
          onChange={(e) => {
            const v = e.target.value;
            if (isProdutoCondicao(v)) setCondicao(v);
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
    </DialogFrame>
  );
}

function OpcionaisDialog({
  productId,
  rawPayload,
  onClose,
  onSaved,
}: {
  productId: string;
  rawPayload: unknown;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const init = extractProdutoOpcionaisFromPayload(rawPayload);
  const [slug, setSlug] = useState(init.slug);
  const [sku, setSku] = useState(init.sku);
  const [peso, setPeso] = useState(init.peso_gramas);
  const [alt, setAlt] = useState(init.altura_cm);
  const [larg, setLarg] = useState(init.largura_cm);
  const [comp, setComp] = useState(init.comprimento_cm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const v = extractProdutoOpcionaisFromPayload(rawPayload);
    setSlug(v.slug);
    setSku(v.sku);
    setPeso(v.peso_gramas);
    setAlt(v.altura_cm);
    setLarg(v.largura_cm);
    setComp(v.comprimento_cm);
  }, [rawPayload]);

  const save = async () => {
    setError(null);
    const slugT = slug.trim();
    if (slugT && !/^[-a-z0-9]+$/i.test(slugT)) {
      setError("Slug inválido: use letras minúsculas, números e hífens.");
      return;
    }

    const pg = parseOptionalNonNegInt(peso);
    const a = parseOptionalNonNegNumber(alt);
    const l = parseOptionalNonNegNumber(larg);
    const c = parseOptionalNonNegNumber(comp);
    if (pg === null || a === null || l === null || c === null) {
      setError("Dimensões e peso devem ser números válidos ≥ 0 ou vazios.");
      return;
    }

    const payload: ProdutoUpdatePayload = {
      slug: slugT || null,
      sku: sku.trim() || null,
      peso_gramas: pg ?? null,
      altura_cm: a ?? null,
      largura_cm: l ?? null,
      comprimento_cm: c ?? null,
    };

    setSaving(true);
    try {
      await produtosRoutes.updateProduto(productId, payload);
      notifySuccess("Dados salvos", "Campos opcionais atualizados.");
      await onSaved();
      onClose();
    } catch (err) {
      setError(getAxiosErrorMessage(err, "Não foi possível salvar."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogFrame
      title="Editar dados opcionais"
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </>
      }
    >
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="dlg-op-slug">Slug</Label>
        <Input id="dlg-op-slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="dlg-op-sku">SKU</Label>
        <Input id="dlg-op-sku" value={sku} onChange={(e) => setSku(e.target.value)} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="dlg-op-peso">Peso (gramas)</Label>
          <Input id="dlg-op-peso" inputMode="numeric" value={peso} onChange={(e) => setPeso(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dlg-op-alt">Altura (cm)</Label>
          <Input id="dlg-op-alt" inputMode="decimal" value={alt} onChange={(e) => setAlt(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dlg-op-larg">Largura (cm)</Label>
          <Input id="dlg-op-larg" inputMode="decimal" value={larg} onChange={(e) => setLarg(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dlg-op-comp">Comprimento (cm)</Label>
          <Input id="dlg-op-comp" inputMode="decimal" value={comp} onChange={(e) => setComp(e.target.value)} />
        </div>
      </div>
    </DialogFrame>
  );
}

function AtivoDialog({
  productId,
  form,
  onClose,
  onSaved,
}: {
  productId: string;
  form: ProdutoSellerEditFormValues;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [ativo, setAtivo] = useState(form.ativo);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAtivo(form.ativo);
  }, [form]);

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      await produtosRoutes.updateProduto(productId, { ativo });
      notifySuccess("Visibilidade atualizada", "O estado ativo/inativo foi salvo no servidor.");
      await onSaved();
      onClose();
    } catch (err) {
      setError(getAxiosErrorMessage(err, "Não foi possível salvar."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogFrame
      title="Ativar ou inativar produto"
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </>
      }
    >
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3">
        <input
          type="checkbox"
          checked={ativo}
          onChange={(e) => setAtivo(e.target.checked)}
          className="mt-1 size-4 rounded border-emerald-400 accent-emerald-600"
        />
        <span className="text-sm text-muted-foreground">
          Produto ativo na vitrine (visível para compradores conforme regras da plataforma).
        </span>
      </label>
    </DialogFrame>
  );
}

function CategoriaDialog({
  productId,
  rawPayload,
  onClose,
  onSaved,
}: {
  productId: string;
  rawPayload: unknown;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { categoria_id: initialCat } = extractCategoriaMarcaIds(rawPayload);

  const [pais, setPais] = useState<CategoriaPai[]>([]);
  const [subs, setSubs] = useState<Subcategoria[]>([]);
  const [paiId, setPaiId] = useState<string>("");
  const [subId, setSubId] = useState<string>(SUB_USAR_PAI);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [newSubNome, setNewSubNome] = useState("");
  const [newSubSlug, setNewSubSlug] = useState("");
  const [creatingSub, setCreatingSub] = useState(false);

  const loadSubs = useCallback(async (pai: number) => {
    const list = await categoriasRoutes.getMinhasSubcategorias({
      categoria_pai_id: pai,
    });
    setSubs(list);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const listPai = await categoriasRoutes.getCategoriasPai();
        if (cancelled) return;
        setPais(listPai);

        const allSubs = await categoriasRoutes.getMinhasSubcategorias();
        if (cancelled) return;

        let resolvedPai = "";
        let resolvedSub = SUB_USAR_PAI;
        if (initialCat != null) {
          const asSub = allSubs.find((s) => s.id === initialCat);
          if (asSub) {
            resolvedPai = String(asSub.categoria_pai_id);
            resolvedSub = String(asSub.id);
          } else {
            resolvedPai = String(initialCat);
            resolvedSub = SUB_USAR_PAI;
          }
        } else if (listPai[0]) {
          resolvedPai = String(listPai[0].id);
        }

        setPaiId(resolvedPai);
        setSubId(resolvedSub);
        if (resolvedPai) {
          await loadSubs(Number.parseInt(resolvedPai, 10));
        }
      } catch (e) {
        if (!cancelled) setError(getAxiosErrorMessage(e, "Não foi possível carregar categorias."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rawPayload, initialCat, loadSubs]);

  useEffect(() => {
    if (!paiId) return;
    void loadSubs(Number.parseInt(paiId, 10)).catch(() => {
      /* ignore */
    });
  }, [paiId, loadSubs]);

  const createSub = async () => {
    const nome = newSubNome.trim();
    if (!nome) {
      setError("Informe o nome da subcategoria.");
      return;
    }
    const paiNum = Number.parseInt(paiId, 10);
    if (!Number.isFinite(paiNum)) {
      setError("Selecione a categoria principal.");
      return;
    }
    setCreatingSub(true);
    setError(null);
    try {
      const slugT = newSubSlug.trim();
      const created = await categoriasRoutes.createSubcategoria({
        categoria_pai_id: paiNum,
        nome,
        ...(slugT ? { slug: slugT } : {}),
        ativo: true,
      });
      await loadSubs(paiNum);
      setSubId(String(created.id));
      setNewSubNome("");
      setNewSubSlug("");
      notifySuccess("Subcategoria criada", "Selecione-a e salve o produto.");
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 409) {
        setError("Já existe uma subcategoria com esse slug.");
        return;
      }
      setError(getAxiosErrorMessage(err, "Não foi possível criar a subcategoria."));
    } finally {
      setCreatingSub(false);
    }
  };

  const save = async () => {
    const paiNum = Number.parseInt(paiId, 10);
    if (!Number.isFinite(paiNum)) {
      setError("Selecione a categoria principal.");
      return;
    }
    const finalId =
      subId && subId !== SUB_USAR_PAI ? Number.parseInt(subId, 10) : paiNum;
    if (!Number.isFinite(finalId)) {
      setError("Selecione uma categoria válida.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await produtosRoutes.updateProduto(productId, { categoria_id: finalId });
      notifySuccess("Categoria salva", "A categoria do produto foi atualizada.");
      await onSaved();
      onClose();
    } catch (err) {
      setError(getAxiosErrorMessage(err, "Não foi possível salvar."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogFrame
      title="Editar categoria"
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => void save()} disabled={saving || loading}>
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </>
      }
    >
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {loading ? <p className="text-sm text-muted-foreground">Carregando categorias…</p> : null}
      <div className="space-y-2">
        <Label htmlFor="dlg-cat-pai">Categoria principal</Label>
        <select
          id="dlg-cat-pai"
          className="h-10 w-full rounded-xl border border-input bg-transparent px-3 text-sm"
          value={paiId}
          onChange={(e) => {
            setPaiId(e.target.value);
            setSubId(SUB_USAR_PAI);
          }}
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
        <Label htmlFor="dlg-cat-sub">Subcategoria (opcional)</Label>
        <select
          id="dlg-cat-sub"
          className="h-10 w-full rounded-xl border border-input bg-transparent px-3 text-sm"
          value={subId}
          onChange={(e) => setSubId(e.target.value)}
          disabled={!paiId}
        >
          <option value={SUB_USAR_PAI}>Usar só categoria principal</option>
          {subs.map((s) => (
            <option key={s.id} value={String(s.id)}>
              {s.nome}
            </option>
          ))}
        </select>
      </div>
      <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/30 p-3 space-y-2">
        <p className="text-xs font-medium text-emerald-900">Nova subcategoria</p>
        <Input
          placeholder="Nome"
          value={newSubNome}
          onChange={(e) => setNewSubNome(e.target.value)}
        />
        <Input
          placeholder="Slug (opcional)"
          value={newSubSlug}
          onChange={(e) => setNewSubSlug(e.target.value)}
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={creatingSub || !paiId}
          onClick={() => void createSub()}
        >
          {creatingSub ? "Criando…" : "Criar subcategoria"}
        </Button>
      </div>
    </DialogFrame>
  );
}

function MarcaDialog({
  productId,
  rawPayload,
  onClose,
  onSaved,
}: {
  productId: string;
  rawPayload: unknown;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { marca_id: initialMarca } = extractCategoriaMarcaIds(rawPayload);

  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [marcaId, setMarcaId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [descricao, setDescricao] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);

  const loadMarcas = useCallback(async () => {
    const list = await marcasRoutes.getMarcas();
    setMarcas(list);
    return list;
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        await loadMarcas();
        if (cancelled) return;
        if (initialMarca != null) {
          setMarcaId(String(initialMarca));
        }
      } catch (e) {
        if (!cancelled) setError(getAxiosErrorMessage(e, "Não foi possível carregar marcas."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rawPayload, initialMarca, loadMarcas]);

  const createMarca = async () => {
    const n = nome.trim();
    const s = slug.trim();
    const d = descricao.trim();
    if (!n) {
      setError("Informe o nome da marca.");
      return;
    }
    if (!s) {
      setError("Informe o slug da marca.");
      return;
    }
    if (!/^[-a-z0-9]+$/i.test(s)) {
      setError("Slug inválido: use letras minúsculas, números e hífens.");
      return;
    }
    if (!d) {
      setError("Informe a descrição da marca.");
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const created = await marcasRoutes.createMarca({
        meta: { nome: n, slug: s, descricao: d, ativo: true },
        logo: logo ?? undefined,
      });
      await loadMarcas();
      setMarcaId(String(created.id));
      setShowCreate(false);
      setNome("");
      setSlug("");
      setDescricao("");
      setLogo(null);
      notifySuccess("Marca criada", "Marca selecionada para o produto. Clique em Salvar.");
    } catch (err) {
      if (isAxiosError(err)) {
        if (err.response?.status === 409) {
          setError("Já existe uma marca com esse slug.");
          return;
        }
        if (err.response?.status === 403) {
          setError("Você não tem permissão para editar esta marca.");
          return;
        }
      }
      setError(getAxiosErrorMessage(err, "Não foi possível criar a marca."));
    } finally {
      setCreating(false);
    }
  };

  const save = async () => {
    const mid = Number.parseInt(marcaId, 10);
    if (!Number.isFinite(mid)) {
      setError("Selecione ou crie uma marca.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await produtosRoutes.updateProduto(productId, { marca_id: mid });
      notifySuccess("Marca salva", "A marca do produto foi atualizada.");
      await onSaved();
      onClose();
    } catch (err) {
      setError(getAxiosErrorMessage(err, "Não foi possível salvar."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogFrame
      title="Editar marca"
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => void save()} disabled={saving || loading}>
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </>
      }
    >
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {loading ? <p className="text-sm text-muted-foreground">Carregando marcas…</p> : null}
      <div className="space-y-2">
        <Label htmlFor="dlg-marca-sel">Marca</Label>
        <select
          id="dlg-marca-sel"
          className="h-10 w-full rounded-xl border border-input bg-transparent px-3 text-sm"
          value={marcaId}
          onChange={(e) => setMarcaId(e.target.value)}
        >
          <option value="">Selecione…</option>
          {marcas.map((m) => (
            <option key={m.id} value={String(m.id)}>
              {m.nome}
            </option>
          ))}
        </select>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => setShowCreate((v) => !v)}>
        {showCreate ? "Fechar criação" : "Criar nova marca"}
      </Button>
      {showCreate ? (
        <div className="space-y-2 rounded-xl border border-slate-200 p-3">
          <Input placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          <Input
            placeholder="Slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            onBlur={() => {
              if (!slug.trim() && nome.trim()) setSlug(slugify(nome));
            }}
          />
          <textarea
            placeholder="Descrição"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="min-h-[72px] w-full resize-y rounded-xl border border-input px-3 py-2 text-sm"
          />
          <Input
            type="file"
            accept="image/*"
            className="text-sm"
            onChange={(e) => setLogo(e.target.files?.[0] ?? null)}
          />
          <p className="text-xs text-muted-foreground">Logo opcional.</p>
          <Button type="button" size="sm" disabled={creating} onClick={() => void createMarca()}>
            {creating ? "Salvando…" : "Registrar marca"}
          </Button>
        </div>
      ) : null}
    </DialogFrame>
  );
}

function CaracteristicasDialog({
  productId,
  produto,
  onClose,
  onSaved,
}: {
  productId: string;
  produto: ProdutoDetalheView;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const toRows = (items: ProdutoIndexadorView[]) =>
    items.length
      ? items.map((i) => ({ campo: i.campo, valor: i.valor }))
      : [{ campo: "", valor: "" }];

  const [rows, setRows] = useState<{ campo: string; valor: string }[]>(() =>
    toRows(produto.indexadores),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRows(toRows(produto.indexadores));
  }, [produto.indexadores, produto.id]);

  const save = async () => {
    const cleaned = rows
      .map((r) => ({
        campo: r.campo.trim(),
        valor: r.valor.trim(),
      }))
      .filter((r) => r.campo.length > 0 && r.valor.length > 0)
      .map((r) => ({
        campo: r.campo.replace(/\s+/g, " "),
        valor: r.valor.replace(/\s+/g, " "),
      }));

    setSaving(true);
    setError(null);
    try {
      await produtosRoutes.postProdutoIndexadores(productId, cleaned);
      notifySuccess("Características salvas", "Indexadores atualizados.");
      await onSaved();
      onClose();
    } catch (err) {
      setError(getAxiosErrorMessage(err, "Não foi possível salvar as características."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogFrame
      title="Editar características"
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </>
      }
    >
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="space-y-3">
        {rows.map((row, idx) => (
          <div key={idx} className="flex flex-wrap gap-2">
            <Input
              placeholder="Campo"
              className="min-w-[120px] flex-1"
              value={row.campo}
              onChange={(e) => {
                const v = e.target.value;
                setRows((r) => r.map((x, i) => (i === idx ? { ...x, campo: v } : x)));
              }}
            />
            <Input
              placeholder="Valor"
              className="min-w-[120px] flex-1"
              value={row.valor}
              onChange={(e) => {
                const v = e.target.value;
                setRows((r) => r.map((x, i) => (i === idx ? { ...x, valor: v } : x)));
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0"
              onClick={() => setRows((r) => r.filter((_, i) => i !== idx))}
            >
              Remover
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setRows((r) => [...r, { campo: "", valor: "" }])}
        >
          Adicionar linha
        </Button>
      </div>
    </DialogFrame>
  );
}

function ImagensDialog({
  productId,
  activeImageCount,
  onClose,
  onSaved,
}: {
  productId: string;
  /** Fotos ativas já publicadas no produto (GET /produtos/{id}). */
  activeImageCount: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);

  const remainingSlots = useMemo(
    () => Math.max(0, PRODUCT_MAX_ACTIVE_IMAGES - activeImageCount),
    [activeImageCount],
  );
  const atActiveLimit = remainingSlots <= 0;

  const onFilesPicked = (fileList: FileList | null) => {
    if (!fileList?.length || validating || atActiveLimit) {
      if (atActiveLimit) {
        setError(notifyProductActiveImageLimitReached());
      }
      return;
    }
    setValidating(true);
    void partitionProductImageFilesAsync(fileList)
      .then(({ accepted, rejected }) => {
        notifyRejectedProductImageFiles(rejected);
        if (!accepted.length) return;

        setFiles((prev) => {
          const merged = [...prev, ...accepted];
          if (exceedsProductActiveImageLimit(activeImageCount, merged.length)) {
            setError(notifyProductActiveImageLimitReached());
            return prev;
          }
          setError(null);
          return merged;
        });
      })
      .finally(() => setValidating(false));
  };

  const save = async () => {
    if (!files.length) {
      setError("Selecione ao menos uma imagem.");
      return;
    }
    if (exceedsProductActiveImageLimit(activeImageCount, files.length)) {
      setError(notifyProductActiveImageLimitReached());
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const fd = new FormData();
      for (const f of files) {
        fd.append("imagens", f);
      }
      await produtosRoutes.addProdutoImagens(productId, fd, { substituir_imagens: false });
      notifySuccess("Imagens enviadas", "A galeria será atualizada.");
      await onSaved();
      onClose();
    } catch (err) {
      setError(getAxiosErrorMessage(err, "Não foi possível enviar as imagens."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogFrame
      title="Adicionar imagens"
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving || validating}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => void save()} disabled={saving || validating}>
            {saving ? "Enviando…" : "Enviar"}
          </Button>
        </>
      }
    >
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        {activeImageCount} de {PRODUCT_MAX_ACTIVE_IMAGES} fotos ativas publicadas.
        {atActiveLimit
          ? " Limite atingido — exclua fotos na edição completa antes de adicionar novas."
          : ` Você pode adicionar até ${remainingSlots} nova${remainingSlots === 1 ? "" : "s"} aqui.`}
      </p>
      <Input
        type="file"
        accept={PRODUCT_IMAGE_ACCEPT}
        multiple
        disabled={validating || saving || atActiveLimit}
        onChange={(e) => {
          onFilesPicked(e.target.files);
          e.target.value = "";
        }}
      />
      {validating ? (
        <p className="text-xs text-muted-foreground" role="status">
          Verificando imagens…
        </p>
      ) : null}
      {files.length > 0 ? (
        <ul className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {files.map((f) => (
            <li key={f.name + f.size}>{f.name}</li>
          ))}
        </ul>
      ) : null}
    </DialogFrame>
  );
}

type Props = {
  dialog: SellerEditDialogId | null;
  productId: string;
  produto: ProdutoDetalheView;
  rawPayload: unknown;
  form: ProdutoSellerEditFormValues | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
};

export function VenderProdutoSellerEditDialogs({
  dialog,
  productId,
  produto,
  rawPayload,
  form,
  onClose,
  onSaved,
}: Props) {
  if (!dialog) return null;
  if ((dialog === "principais" || dialog === "ativo") && !form) return null;

  switch (dialog) {
    case "principais":
      return (
        <PrincipaisDialog productId={productId} form={form!} onClose={onClose} onSaved={onSaved} />
      );
    case "opcionais":
      return (
        <OpcionaisDialog productId={productId} rawPayload={rawPayload} onClose={onClose} onSaved={onSaved} />
      );
    case "ativo":
      return <AtivoDialog productId={productId} form={form!} onClose={onClose} onSaved={onSaved} />;
    case "categoria":
      return (
        <CategoriaDialog
          productId={productId}
          rawPayload={rawPayload}
          onClose={onClose}
          onSaved={onSaved}
        />
      );
    case "marca":
      return (
        <MarcaDialog productId={productId} rawPayload={rawPayload} onClose={onClose} onSaved={onSaved} />
      );
    case "caracteristicas":
      return (
        <CaracteristicasDialog
          productId={productId}
          produto={produto}
          onClose={onClose}
          onSaved={onSaved}
        />
      );
    case "imagens":
      return (
        <ImagensDialog
          productId={productId}
          activeImageCount={produto.imagensGaleria.length}
          onClose={onClose}
          onSaved={onSaved}
        />
      );
    default:
      return null;
  }
}
