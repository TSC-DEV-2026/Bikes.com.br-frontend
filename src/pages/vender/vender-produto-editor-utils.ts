import * as marcasRoutes from "@/api/endpoints/marcas.routes";
import type { ProdutoUpdatePayload } from "@/api/endpoints/produtos.routes";
import type { CategoriaPai, Subcategoria } from "@/types/categoria";
import type { Marca } from "@/types/marca";
import type { ProdutoDetalheView, ProdutoSellerEditFormValues } from "@/types/produto";
import {
  buildProdutoSellerEditFormValues,
  extractCategoriaMarcaIds,
  extractCategoriaMarcaLabels,
  extractProdutoOpcionaisFromPayload,
  applyProdutoSellerEditFormToDetalheView,
  isProdutoCondicao,
} from "@/types/produto";

export const SUB_USAR_PAI = "__usar_pai__";

/** Resolve categoria pai + subcategoria a partir do id salvo no produto. */
export function resolveInitialCategoriaIds(
  categoriaId: number | null,
  pais: ReadonlyArray<{ id: number }>,
  allSubs: ReadonlyArray<{ id: number; categoria_pai_id: number }>,
): { paiId: string; subId: string } {
  if (categoriaId == null) return { paiId: "", subId: SUB_USAR_PAI };
  const asSub = allSubs.find((s) => s.id === categoriaId);
  if (asSub) {
    return { paiId: String(asSub.categoria_pai_id), subId: String(asSub.id) };
  }
  if (pais.some((p) => p.id === categoriaId)) {
    return { paiId: String(categoriaId), subId: SUB_USAR_PAI };
  }
  return { paiId: String(categoriaId), subId: SUB_USAR_PAI };
}

export type ProdutoCategoriaMarcaResolvida = {
  categoriaPaiId: string;
  subcategoriaId: string;
  marcaId: string;
  categoriaPaiNome: string | null;
  subcategoriaNome: string | null;
  marcaNome: string | null;
  categoriaNaoEncontrada: boolean;
  marcaNaoEncontrada: boolean;
  marcaInativa: boolean;
  /** Marca resolvida (lista ativa ou GET /marcas/{id}). */
  marcaAtual: Marca | null;
};

/** Resolve ids e nomes de categoria/subcategoria/marca a partir do produto e catálogos. */
export function resolveProdutoCategoriaMarca(
  data: unknown,
  pais: ReadonlyArray<CategoriaPai>,
  subs: ReadonlyArray<Subcategoria>,
  marcas: ReadonlyArray<Marca>,
): ProdutoCategoriaMarcaResolvida {
  const { categoria_id, marca_id } = extractCategoriaMarcaIds(data);
  const nested = extractCategoriaMarcaLabels(data);
  const { paiId, subId } = resolveInitialCategoriaIds(categoria_id, pais, subs);

  const pai = paiId ? pais.find((p) => String(p.id) === paiId) : undefined;
  const sub =
    subId !== SUB_USAR_PAI ? subs.find((s) => String(s.id) === subId) : undefined;

  const categoriaPaiNome = pai?.nome ?? sub?.categoria_pai?.nome ?? nested.categoriaLabel;
  const subcategoriaNome = sub?.nome ?? null;

  const categoriaNaoEncontrada =
    categoria_id != null && !categoriaPaiNome && !subcategoriaNome;

  const marcaId = marca_id != null ? String(marca_id) : "";
  const marcaLista = marca_id != null ? marcas.find((m) => m.id === marca_id) : undefined;
  const marcaNome = marcaLista?.nome ?? nested.marcaLabel ?? null;

  return {
    categoriaPaiId: paiId,
    subcategoriaId: subId,
    marcaId,
    categoriaPaiNome,
    subcategoriaNome,
    marcaNome,
    categoriaNaoEncontrada,
    marcaNaoEncontrada: marca_id != null && !marcaNome,
    marcaInativa: false,
    marcaAtual: marcaLista ?? null,
  };
}

/** Completa resolução de marca com GET /marcas/{id} quando ausente na listagem ativa. */
export async function enrichMarcaNaResolucao(
  base: ProdutoCategoriaMarcaResolvida,
  data: unknown,
  marcasAtivas: ReadonlyArray<Marca>,
): Promise<ProdutoCategoriaMarcaResolvida> {
  const { marca_id } = extractCategoriaMarcaIds(data);
  if (marca_id == null) {
    return { ...base, marcaInativa: false, marcaAtual: null };
  }

  const inList = marcasAtivas.find((m) => m.id === marca_id);
  if (inList) {
    return {
      ...base,
      marcaId: String(marca_id),
      marcaNome: inList.nome,
      marcaNaoEncontrada: false,
      marcaInativa: false,
      marcaAtual: inList,
    };
  }

  const fetched = await marcasRoutes.fetchMarcaById(marca_id);
  if (fetched) {
    return {
      ...base,
      marcaId: String(marca_id),
      marcaNome: fetched.nome,
      marcaNaoEncontrada: false,
      marcaInativa: !fetched.ativo,
      marcaAtual: fetched,
    };
  }

  const nested = extractCategoriaMarcaLabels(data);
  const marcaNome = nested.marcaLabel ?? base.marcaNome ?? null;

  return {
    ...base,
    marcaId: String(marca_id),
    marcaNome,
    marcaNaoEncontrada: !marcaNome,
    marcaInativa: false,
    marcaAtual: null,
  };
}

export type ProdutoSellerEditorDraft = ProdutoSellerEditFormValues & {
  slug: string;
  sku: string;
  peso_gramas: string;
  altura_cm: string;
  largura_cm: string;
  comprimento_cm: string;
  status: string;
  categoriaPaiId: string;
  subcategoriaId: string;
  marcaId: string;
};

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function parseMoneyBr(raw: string): number | null {
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

function pickStatusFromPayload(data: unknown): string {
  if (data == null || typeof data !== "object" || Array.isArray(data)) return "";
  const r = data as Record<string, unknown>;
  const v = r.status;
  return typeof v === "string" ? v.trim() : "";
}

export function buildEditorDraft(
  normalized: ProdutoDetalheView,
  data: unknown,
): ProdutoSellerEditorDraft {
  const base = buildProdutoSellerEditFormValues(normalized, data);
  const opc = extractProdutoOpcionaisFromPayload(data);
  const { marca_id } = extractCategoriaMarcaIds(data);

  return {
    ...base,
    slug: opc.slug,
    sku: opc.sku,
    peso_gramas: opc.peso_gramas,
    altura_cm: opc.altura_cm,
    largura_cm: opc.largura_cm,
    comprimento_cm: opc.comprimento_cm,
    status: pickStatusFromPayload(data) || normalized.status?.trim() || "",
    categoriaPaiId: "",
    subcategoriaId: SUB_USAR_PAI,
    marcaId: marca_id != null ? String(marca_id) : "",
  };
}

export function resolveCategoriaSelection(
  draft: ProdutoSellerEditorDraft,
  allSubIds: ReadonlySet<number>,
): { paiId: string; subId: string } {
  const catId = draft.categoriaPaiId.trim();
  if (!catId) return { paiId: "", subId: SUB_USAR_PAI };

  const asNum = Number.parseInt(catId, 10);
  if (allSubIds.has(asNum)) {
    return { paiId: "", subId: String(asNum) };
  }
  return { paiId: catId, subId: draft.subcategoriaId || SUB_USAR_PAI };
}

export function applyEditorDraftToDetalheView(
  base: ProdutoDetalheView,
  draft: ProdutoSellerEditorDraft,
): ProdutoDetalheView {
  const next = applyProdutoSellerEditFormToDetalheView(base, draft);
  return {
    ...next,
    status: draft.status.trim() || next.status,
  };
}

export function draftsEqual(a: ProdutoSellerEditorDraft, b: ProdutoSellerEditorDraft): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function validateWizardStep1(draft: ProdutoSellerEditorDraft): string | null {
  if (!draft.titulo.trim()) return "Informe o título do produto.";
  if (!draft.descricao.trim()) return "Informe a descrição.";
  if (!isProdutoCondicao(draft.condicao)) {
    return "Selecione a condição do produto.";
  }
  return null;
}

export function validateWizardStep2(draft: ProdutoSellerEditorDraft): string | null {
  const paiNum = Number.parseInt(draft.categoriaPaiId, 10);
  if (!Number.isFinite(paiNum)) return "Selecione a categoria principal.";
  const marcaNum = Number.parseInt(draft.marcaId, 10);
  if (!Number.isFinite(marcaNum)) return "Selecione ou crie uma marca.";
  return null;
}

export function validateWizardStep3(draft: ProdutoSellerEditorDraft): string | null {
  const precoN = parseMoneyBr(draft.preco);
  if (precoN == null || precoN < 0) return "Informe um preço válido (≥ 0).";
  const promoRaw = draft.preco_promocional.trim();
  if (promoRaw) {
    const p = parseMoneyBr(promoRaw);
    if (p == null || p < 0) return "Preço promocional inválido ou deixe em branco.";
  }
  return null;
}

export function validateWizardStep4(draft: ProdutoSellerEditorDraft): string | null {
  const slugT = draft.slug.trim();
  if (slugT && !/^[-a-z0-9]+$/i.test(slugT)) {
    return "Slug inválido: use letras minúsculas, números e hífens.";
  }
  const pg = parseOptionalNonNegInt(draft.peso_gramas);
  const a = parseOptionalNonNegNumber(draft.altura_cm);
  const l = parseOptionalNonNegNumber(draft.largura_cm);
  const c = parseOptionalNonNegNumber(draft.comprimento_cm);
  if (pg === null || a === null || l === null || c === null) {
    return "Dimensões e peso devem ser números válidos ≥ 0 ou vazios.";
  }
  return null;
}

export function validateEditorDraft(draft: ProdutoSellerEditorDraft): string | null {
  if (!draft.titulo.trim()) return "Informe um título.";
  if (!draft.descricao.trim()) return "Informe uma descrição.";

  const precoN = parseMoneyBr(draft.preco);
  if (precoN == null || precoN < 0) return "Informe um preço válido (≥ 0).";

  const promoRaw = draft.preco_promocional.trim();
  if (promoRaw) {
    const p = parseMoneyBr(promoRaw);
    if (p == null || p < 0) return "Preço promocional inválido ou deixe em branco.";
  }

  const slugT = draft.slug.trim();
  if (slugT && !/^[-a-z0-9]+$/i.test(slugT)) {
    return "Slug inválido: use letras minúsculas, números e hífens.";
  }

  const pg = parseOptionalNonNegInt(draft.peso_gramas);
  const a = parseOptionalNonNegNumber(draft.altura_cm);
  const l = parseOptionalNonNegNumber(draft.largura_cm);
  const c = parseOptionalNonNegNumber(draft.comprimento_cm);
  if (pg === null || a === null || l === null || c === null) {
    return "Dimensões e peso devem ser números válidos ≥ 0 ou vazios.";
  }

  const paiNum = Number.parseInt(draft.categoriaPaiId, 10);
  if (!Number.isFinite(paiNum)) return "Selecione a categoria principal.";

  const marcaNum = Number.parseInt(draft.marcaId, 10);
  if (!Number.isFinite(marcaNum)) return "Selecione ou crie uma marca.";

  return null;
}

export function buildUpdatePayloadFromDraft(
  draft: ProdutoSellerEditorDraft,
): ProdutoUpdatePayload | null {
  const err = validateEditorDraft(draft);
  if (err) return null;

  const precoN = parseMoneyBr(draft.preco)!;
  let preco_promocional: number | null | undefined;
  const promoRaw = draft.preco_promocional.trim();
  if (!promoRaw) {
    preco_promocional = null;
  } else {
    preco_promocional = parseMoneyBr(promoRaw)!;
  }

  const paiNum = Number.parseInt(draft.categoriaPaiId, 10);
  const finalCategoriaId =
    draft.subcategoriaId && draft.subcategoriaId !== SUB_USAR_PAI
      ? Number.parseInt(draft.subcategoriaId, 10)
      : paiNum;

  const pg = parseOptionalNonNegInt(draft.peso_gramas);
  const a = parseOptionalNonNegNumber(draft.altura_cm);
  const l = parseOptionalNonNegNumber(draft.largura_cm);
  const c = parseOptionalNonNegNumber(draft.comprimento_cm);

  const slugT = draft.slug.trim();

  return {
    titulo: draft.titulo.trim(),
    descricao: draft.descricao.trim(),
    slug: slugT || null,
    preco: precoN,
    preco_promocional,
    condicao: draft.condicao,
    ativo: draft.ativo,
    categoria_id: finalCategoriaId,
    marca_id: Number.parseInt(draft.marcaId, 10),
    sku: draft.sku.trim() || null,
    peso_gramas: pg ?? null,
    altura_cm: a ?? null,
    largura_cm: l ?? null,
    comprimento_cm: c ?? null,
  };
}

/** Botões secundários (Cancelar / Voltar) — mesmo padrão do topo "Voltar para o produto". */
export const venderProdutoSecondaryButtonClass =
  "gap-2 px-3 font-semibold text-foreground hover:text-foreground";

export function categoriaIdForSave(draft: ProdutoSellerEditorDraft): number | null {
  const paiNum = Number.parseInt(draft.categoriaPaiId, 10);
  if (!Number.isFinite(paiNum)) return null;
  if (draft.subcategoriaId && draft.subcategoriaId !== SUB_USAR_PAI) {
    const sub = Number.parseInt(draft.subcategoriaId, 10);
    return Number.isFinite(sub) ? sub : paiNum;
  }
  return paiNum;
}
