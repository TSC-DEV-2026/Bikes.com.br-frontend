import { useCallback, useEffect, useRef } from "react";

import {
  clearProductCreateImageDraft,
  saveProductCreateImageDraft,
} from "@/pages/vender/product-create-image-draft-db";
import { parseProdutoCondicao, type ProdutoCondicao } from "@/types/produto";
import {
  type CreateIndexadorRow,
  type CreateWizardFields,
} from "@/pages/vender/vender-produto-create-utils";

export const PRODUCT_CREATE_DRAFT_VERSION = 1;

export type ProductCreateDraftScope = {
  userKey?: string;
  vendedorId?: number;
};

export type ProductCreateDraftPayload = {
  version: typeof PRODUCT_CREATE_DRAFT_VERSION;
  savedAt: number;
  step: number;
  hadImageCount: number;
  principalId: string | null;
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
  requiredFieldValues: Record<string, string>;
  indexadorRows: CreateIndexadorRow[];
};

export function getProductCreateDraftKey(scope: ProductCreateDraftScope): string {
  const user = scope.userKey?.trim() || "anon";
  const seller =
    scope.vendedorId != null && Number.isFinite(scope.vendedorId)
      ? String(scope.vendedorId)
      : "unknown";
  return `bikes:product-create-draft:v${PRODUCT_CREATE_DRAFT_VERSION}:user:${user}:seller:${seller}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function parseIndexadorRows(raw: unknown): CreateIndexadorRow[] | null {
  if (!Array.isArray(raw)) return null;
  const rows: CreateIndexadorRow[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const id = typeof item.id === "string" ? item.id : "";
    const campo = typeof item.campo === "string" ? item.campo : "";
    const valor = typeof item.valor === "string" ? item.valor : "";
    if (!id) continue;
    rows.push({ id, campo, valor });
  }
  return rows.length ? rows : null;
}

export function readProductCreateDraft(key: string): ProductCreateDraftPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) return null;
    if (parsed.version !== PRODUCT_CREATE_DRAFT_VERSION) return null;

    const condicao = parseProdutoCondicao(
      typeof parsed.condicao === "string" ? parsed.condicao : undefined,
    );
    const indexadorRows = parseIndexadorRows(parsed.indexadorRows) ?? [];

    const requiredFieldValues: Record<string, string> = {};
    if (isRecord(parsed.requiredFieldValues)) {
      for (const [key, val] of Object.entries(parsed.requiredFieldValues)) {
        if (typeof val === "string") requiredFieldValues[key] = val;
      }
    }

    const step =
      typeof parsed.step === "number" && Number.isFinite(parsed.step)
        ? Math.min(7, Math.max(1, Math.trunc(parsed.step)))
        : 1;

    return {
      version: PRODUCT_CREATE_DRAFT_VERSION,
      savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : Date.now(),
      step,
      hadImageCount:
        typeof parsed.hadImageCount === "number" && parsed.hadImageCount > 0
          ? Math.trunc(parsed.hadImageCount)
          : 0,
      principalId:
        typeof parsed.principalId === "string" && parsed.principalId.trim()
          ? parsed.principalId.trim()
          : null,
      paiIdStr: typeof parsed.paiIdStr === "string" ? parsed.paiIdStr : "",
      categoriaSlug: typeof parsed.categoriaSlug === "string" ? parsed.categoriaSlug : null,
      subcategoriaIdStr:
        typeof parsed.subcategoriaIdStr === "string" ? parsed.subcategoriaIdStr : "",
      marcaIdStr: typeof parsed.marcaIdStr === "string" ? parsed.marcaIdStr : "",
      titulo: typeof parsed.titulo === "string" ? parsed.titulo : "",
      slug: typeof parsed.slug === "string" ? parsed.slug : "",
      descricao: typeof parsed.descricao === "string" ? parsed.descricao : "",
      preco: typeof parsed.preco === "string" ? parsed.preco : "",
      precoPromocional:
        typeof parsed.precoPromocional === "string" ? parsed.precoPromocional : "",
      condicao,
      sku: typeof parsed.sku === "string" ? parsed.sku : "",
      estoqueInicial: typeof parsed.estoqueInicial === "string" ? parsed.estoqueInicial : "",
      pesoGramas: typeof parsed.pesoGramas === "string" ? parsed.pesoGramas : "",
      alturaCm: typeof parsed.alturaCm === "string" ? parsed.alturaCm : "",
      larguraCm: typeof parsed.larguraCm === "string" ? parsed.larguraCm : "",
      comprimentoCm: typeof parsed.comprimentoCm === "string" ? parsed.comprimentoCm : "",
      ativo: parsed.ativo !== false,
      requiredFieldValues,
      indexadorRows,
    };
  } catch {
    return null;
  }
}

export function writeProductCreateDraft(key: string, payload: ProductCreateDraftPayload): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // quota exceeded or private mode
  }
}

export function clearProductCreateDraft(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
  void clearProductCreateImageDraft(key);
}

export function buildProductCreateDraft(
  fields: CreateWizardFields,
  step: number,
): ProductCreateDraftPayload {
  return {
    version: PRODUCT_CREATE_DRAFT_VERSION,
    savedAt: Date.now(),
    step: Math.min(7, Math.max(1, step)),
    hadImageCount: fields.images.length,
    principalId: fields.principalId,
    paiIdStr: fields.paiIdStr,
    categoriaSlug: fields.categoriaSlug,
    subcategoriaIdStr: fields.subcategoriaIdStr,
    marcaIdStr: fields.marcaIdStr,
    titulo: fields.titulo,
    slug: fields.slug,
    descricao: fields.descricao,
    preco: fields.preco,
    precoPromocional: fields.precoPromocional,
    condicao: fields.condicao,
    sku: fields.sku,
    estoqueInicial: fields.estoqueInicial,
    pesoGramas: fields.pesoGramas,
    alturaCm: fields.alturaCm,
    larguraCm: fields.larguraCm,
    comprimentoCm: fields.comprimentoCm,
    ativo: fields.ativo,
    requiredFieldValues: fields.requiredFieldValues,
    indexadorRows: fields.indexadorRows,
  };
}

export function isProductCreateDraftMeaningful(draft: ProductCreateDraftPayload): boolean {
  if (draft.titulo.trim() || draft.descricao.trim() || draft.preco.trim()) return true;
  if (draft.precoPromocional.trim() || draft.slug.trim() || draft.sku.trim()) return true;
  if (draft.subcategoriaIdStr.trim() || draft.marcaIdStr.trim()) return true;
  if (draft.estoqueInicial.trim() || draft.pesoGramas.trim()) return true;
  if (draft.hadImageCount > 0) return true;
  if (Object.values(draft.requiredFieldValues).some((v) => v.trim())) return true;
  if (draft.indexadorRows.some((r) => r.campo.trim() || r.valor.trim())) return true;
  return false;
}

const AUTOSAVE_MS = 500;

export function useProductCreateDraftAutosave(options: {
  enabled: boolean;
  draftKey: string | null;
  fields: CreateWizardFields;
  wizardStep: number;
}) {
  const { enabled, draftKey, fields, wizardStep } = options;
  const skipNextSaveRef = useRef(false);

  const clearDraft = useCallback(() => {
    if (!draftKey) return;
    skipNextSaveRef.current = true;
    clearProductCreateDraft(draftKey);
  }, [draftKey]);

  useEffect(() => {
    if (!enabled || !draftKey) return;

    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      const payload = buildProductCreateDraft(fields, wizardStep);
      if (!isProductCreateDraftMeaningful(payload)) {
        clearProductCreateDraft(draftKey);
        return;
      }
      writeProductCreateDraft(draftKey, payload);
      void saveProductCreateImageDraft(draftKey, fields.images, fields.principalId);
    }, AUTOSAVE_MS);

    return () => window.clearTimeout(timer);
  }, [enabled, draftKey, fields, wizardStep]);

  return { clearDraft };
}
