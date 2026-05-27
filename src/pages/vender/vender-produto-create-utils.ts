import {
  isValidProductImageExtension,
  PRODUCT_IMAGE_TYPE_ERROR,
} from "@/pages/vender/vender-produto-images-manager";
import type { ProdutoCondicao, ProdutoCreateMeta } from "@/types/produto";
import {
  getCategoryRequirements,
  validateCategoryRequiredFields,
} from "@/pages/vender/category-product-requirements";
import {
  SUB_USAR_PAI,
  validateWizardStep1,
  validateWizardStep4,
  type ProdutoSellerEditorDraft,
} from "@/pages/vender/vender-produto-editor-utils";

export const MAX_PRICE = 1_000_000;
export const MAX_PRICE_ERROR = "O valor máximo permitido é R$ 1.000.000,00.";

export function sanitizeCurrencyDraft(value: string): string {
  let s = value.replace(/[^\d.,]/g, "");
  const firstComma = s.indexOf(",");
  if (firstComma >= 0) {
    s = s.slice(0, firstComma + 1) + s.slice(firstComma + 1).replace(/,/g, "");
  }
  return s;
}

export function parseCurrencyDraftToNumber(value: string): number | null {
  const cleaned = value.trim();
  if (!cleaned) return null;

  const normalized = cleaned.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

export function formatCurrencyBRFromNumber(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function normalizeCurrencyDraftOnBlur(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const n = parseCurrencyDraftToNumber(trimmed);
  if (n == null) return trimmed;
  return formatCurrencyBRFromNumber(n);
}

/** Converte texto de preço (rascunho ou formatado) para number no payload. */
export function parseCurrencyBR(maskedValue: string): number | null {
  return parseCurrencyDraftToNumber(maskedValue);
}

export function validateCreatePriceField(
  raw: string,
  options: { required: boolean },
): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return options.required ? "Informe o preço." : null;
  }

  const n = parseCurrencyDraftToNumber(trimmed);
  if (n == null) {
    return options.required
      ? "Informe um preço válido."
      : "Preço promocional inválido ou deixe em branco.";
  }
  if (n <= 0) {
    return options.required
      ? "O preço deve ser maior que zero."
      : "O preço promocional deve ser maior que zero.";
  }
  if (n > MAX_PRICE) return MAX_PRICE_ERROR;
  return null;
}

export function validatePromoNotAbovePrice(precoRaw: string, promoRaw: string): string | null {
  const promoTrimmed = promoRaw.trim();
  if (!promoTrimmed) return null;

  const precoN = parseCurrencyDraftToNumber(precoRaw.trim());
  const promoN = parseCurrencyDraftToNumber(promoTrimmed);
  if (precoN != null && promoN != null && promoN > precoN) {
    return "O preço promocional não pode ser maior que o preço.";
  }
  return null;
}

export type CreateImageItem = {
  id: string;
  file: File;
  url: string;
};

export type CreateIndexadorRow = {
  id: string;
  campo: string;
  valor: string;
};

export const CREATE_MARCA_PLACEHOLDER = "__placeholder__";

export function newCreateIndexadorRow(): CreateIndexadorRow {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    campo: "",
    valor: "",
  };
}

export function newCreateImageId(): string {
  return `img-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function slugifyCreate(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

export function parseOptionalInt(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
}

export function parseOptionalNumber(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const normalized = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}

export function parseCreatedProdutoId(data: unknown): number | null {
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

export type CreateWizardFields = {
  paiIdStr: string;
  categoriaSlug: string | null;
  subcategoriaIdStr: string;
  marcaIdStr: string;
  titulo: string;
  slug: string;
  descricao: string;
  preco: string;
  precoPromocional: string;
  condicao: ProdutoCondicao;
  sku: string;
  estoqueInicial: string;
  pesoGramas: string;
  alturaCm: string;
  larguraCm: string;
  comprimentoCm: string;
  ativo: boolean;
  images: CreateImageItem[];
  principalId: string | null;
  requiredFieldValues: Record<string, string>;
  indexadorRows: CreateIndexadorRow[];
};

export function buildCreateIndexadores(fields: CreateWizardFields): { campo: string; valor: string }[] {
  const out: { campo: string; valor: string }[] = [];
  const usedCampos = new Set<string>();

  for (const campo of getCategoryRequirements(fields.categoriaSlug)) {
    const valor = (fields.requiredFieldValues[campo] ?? "").trim();
    if (!valor) continue;
    out.push({ campo, valor });
    usedCampos.add(campo.toLowerCase());
  }

  for (const r of fields.indexadorRows) {
    const campoRaw = r.campo.trim();
    const valor = r.valor.trim();
    if (!campoRaw || !valor) continue;
    if (usedCampos.has(campoRaw.toLowerCase())) continue;
    out.push({ campo: campoRaw.toLowerCase(), valor });
    usedCampos.add(campoRaw.toLowerCase());
  }

  return out;
}

export function toEditorDraft(fields: CreateWizardFields): ProdutoSellerEditorDraft {
  return {
    titulo: fields.titulo,
    descricao: fields.descricao,
    condicao: fields.condicao,
    ativo: fields.ativo,
    categoriaPaiId: fields.paiIdStr,
    subcategoriaId: fields.subcategoriaIdStr,
    marcaId:
      fields.marcaIdStr && fields.marcaIdStr !== CREATE_MARCA_PLACEHOLDER
        ? fields.marcaIdStr
        : "",
    preco: fields.preco,
    preco_promocional: fields.precoPromocional,
    sku: fields.sku,
    slug: fields.slug,
    peso_gramas: fields.pesoGramas,
    altura_cm: fields.alturaCm,
    largura_cm: fields.larguraCm,
    comprimento_cm: fields.comprimentoCm,
    estoque_inicial: fields.estoqueInicial,
    status: "",
  };
}

export function validateCreateWizardStep2(fields: CreateWizardFields): string | null {
  const paiNum = Number.parseInt(fields.paiIdStr, 10);
  if (!Number.isFinite(paiNum)) return "Escolha uma categoria principal.";

  const subRaw = fields.subcategoriaIdStr.trim();
  if (!subRaw || subRaw === SUB_USAR_PAI) {
    return "Escolha ou crie um tipo específico para continuar.";
  }
  const subNum = Number.parseInt(subRaw, 10);
  if (!Number.isFinite(subNum)) {
    return "Escolha ou crie um tipo específico para continuar.";
  }

  if (!fields.marcaIdStr || fields.marcaIdStr === CREATE_MARCA_PLACEHOLDER) {
    return "Selecione ou crie uma marca.";
  }
  const marcaNum = Number.parseInt(fields.marcaIdStr, 10);
  if (!Number.isFinite(marcaNum)) return "Selecione ou crie uma marca.";

  return null;
}

export function validateCreateWizardStep3(fields: CreateWizardFields): string | null {
  const precoErr = validateCreatePriceField(fields.preco, { required: true });
  if (precoErr) return precoErr;

  const promoErr = validateCreatePriceField(fields.precoPromocional, { required: false });
  if (promoErr) return promoErr;

  const promoVsPreco = validatePromoNotAbovePrice(fields.preco, fields.precoPromocional);
  if (promoVsPreco) return promoVsPreco;
  const estoqueNum = parseOptionalInt(fields.estoqueInicial);
  if (fields.estoqueInicial.trim() && (estoqueNum == null || estoqueNum < 0)) {
    return "Informe um estoque inicial válido (maior ou igual a zero).";
  }
  return null;
}

export function validateCreateWizardStep4(fields: CreateWizardFields): string | null {
  if (!fields.images.length) return null;

  const invalid = fields.images.filter((im) => !isValidProductImageExtension(im.file));
  if (invalid.length > 0) {
    return `${PRODUCT_IMAGE_TYPE_ERROR} Remova: ${invalid.map((im) => im.file.name).join(", ")}.`;
  }

  const principalIndex = resolvePrincipalIndex(fields);
  if (principalIndex < 0 || principalIndex >= fields.images.length) {
    return "Selecione uma imagem principal válida.";
  }
  return null;
}

export function validateCreateWizardFull(fields: CreateWizardFields): string | null {
  const err1 = validateWizardStep1(toEditorDraft(fields));
  if (err1) return err1;
  const err2 = validateCreateWizardStep2(fields);
  if (err2) return err2;
  const err3 = validateCreateWizardStep3(fields);
  if (err3) return err3;
  const err4 = validateCreateWizardStep4(fields);
  if (err4) return err4;
  const err5 = validateCreateWizardStep5(fields);
  if (err5) return err5;
  const err6 = validateWizardStep4(toEditorDraft(fields));
  if (err6) return err6;
  return null;
}

export function validateCreateWizardStep5(fields: CreateWizardFields): string | null {
  return validateCategoryRequiredFields(fields.categoriaSlug, fields.requiredFieldValues);
}

export function resolvePrincipalIndex(fields: CreateWizardFields): number {
  if (!fields.images.length) return 0;
  if (fields.principalId) {
    const i = fields.images.findIndex((im) => im.id === fields.principalId);
    if (i >= 0) return i;
  }
  return 0;
}

export function buildCreateMeta(fields: CreateWizardFields): ProdutoCreateMeta | null {
  const err = validateCreateWizardFull(fields);
  if (err) return null;

  const subNum = Number.parseInt(fields.subcategoriaIdStr, 10);
  if (!Number.isFinite(subNum)) return null;
  const categoriaId = subNum;

  const precoNum = parseCurrencyBR(fields.preco)!;
  const prom = parseCurrencyBR(fields.precoPromocional);

  const indexadores = buildCreateIndexadores(fields);

  const marcaNum = Number.parseInt(fields.marcaIdStr, 10);

  const meta: ProdutoCreateMeta = {
    categoria_id: categoriaId,
    marca_id: marcaNum,
    titulo: fields.titulo.trim(),
    descricao: fields.descricao.trim(),
    preco: precoNum,
    condicao: fields.condicao,
    ...(fields.images.length > 0
      ? { imagem_principal_index: resolvePrincipalIndex(fields) }
      : {}),
    indexadores: indexadores.length ? indexadores : undefined,
    ativo: fields.ativo,
  };

  const slugFinal = slugifyCreate(fields.titulo);
  if (slugFinal) meta.slug = slugFinal;

  if (prom != null) meta.preco_promocional = prom;
  const skuT = fields.sku.trim();
  if (skuT) meta.sku = skuT;

  const pg = parseOptionalInt(fields.pesoGramas);
  if (pg != null) meta.peso_gramas = pg;
  const a = parseOptionalNumber(fields.alturaCm);
  if (a != null) meta.altura_cm = a;
  const l = parseOptionalNumber(fields.larguraCm);
  if (l != null) meta.largura_cm = l;
  const c = parseOptionalNumber(fields.comprimentoCm);
  if (c != null) meta.comprimento_cm = c;
  const est = parseOptionalInt(fields.estoqueInicial);
  meta.estoque_inicial = est != null && est >= 0 ? est : 0;

  return meta;
}

export function validateCreateWizardStep(step: number, fields: CreateWizardFields): string | null {
  switch (step) {
    case 1:
      return validateWizardStep1(toEditorDraft(fields));
    case 2:
      return validateCreateWizardStep2(fields);
    case 3:
      return validateCreateWizardStep3(fields);
    case 4:
      return validateCreateWizardStep4(fields);
    case 5:
      return validateCreateWizardStep5(fields);
    case 6:
      return validateWizardStep4(toEditorDraft(fields));
    default:
      return validateCreateWizardFull(fields);
  }
}
