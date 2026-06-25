import api from "@/api/axiosInstance";
import type {
  CategoriaPai,
  Subcategoria,
  SubcategoriaCreate,
  SubcategoriaUpdate,
} from "@/types/categoria";

export const CATEGORIAS_ENDPOINTS = {
  root: "/categorias",
  subcategoria: "/categorias/subcategoria",
  subcategoriaById: (id: number | string) => `/categorias/subcategoria/${id}`,
} as const;

export type GetMinhasSubcategoriasParams = {
  categoria_pai_id?: number;
  ativo?: boolean;
};

export type CategoriaDetail = {
  id: number;
  nome: string;
  slug: string;
  ativo: boolean;
  categoria_pai_id: number | null;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function unwrapArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (isRecord(data)) {
    const items = data.items;
    if (Array.isArray(items)) return items;
  }
  return [];
}

function parseId(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number.parseInt(v, 10);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function parseCategoriaPai(row: unknown): CategoriaPai | null {
  if (!isRecord(row)) return null;
  const id = parseId(row.id);
  const nome = typeof row.nome === "string" ? row.nome.trim() : "";
  const slug = typeof row.slug === "string" ? row.slug.trim() : "";
  const categoriaPaiId = parseId(row.categoria_pai_id) ?? parseId(row.pai_id);
  if (id == null || !nome) return null;
  // Só categorias pai: sem pai ou auto-referência (id === categoria_pai_id).
  if (categoriaPaiId != null && categoriaPaiId !== id) return null;
  return {
    id,
    nome,
    slug: slug || String(id),
    ativo: row.ativo !== false,
    categoria_pai_id: null,
  };
}

function parseSubcategoria(row: unknown): Subcategoria | null {
  if (!isRecord(row)) return null;
  const id = parseId(row.id);
  const nome = typeof row.nome === "string" ? row.nome.trim() : "";
  const slug = typeof row.slug === "string" ? row.slug.trim() : "";
  const categoria_pai_id =
    parseId(row.categoria_pai_id) ?? parseId(row.pai_id);
  const pai_id = parseId(row.pai_id) ?? categoria_pai_id;
  const vendedor_id = parseId(row.vendedor_id);
  if (id == null || !nome || categoria_pai_id == null || vendedor_id == null) {
    return null;
  }

  let categoria_pai: Subcategoria["categoria_pai"];
  const cp = row.categoria_pai;
  if (isRecord(cp)) {
    const cpId = parseId(cp.id);
    const cpNome = typeof cp.nome === "string" ? cp.nome.trim() : "";
    const cpSlug = typeof cp.slug === "string" ? cp.slug.trim() : "";
    if (cpId != null && cpNome) {
      categoria_pai = { id: cpId, nome: cpNome, slug: cpSlug || String(cpId) };
    }
  }

  return {
    id,
    nome,
    slug: slug || String(id),
    pai_id: pai_id ?? categoria_pai_id,
    categoria_pai_id,
    vendedor_id,
    ativo: row.ativo !== false,
    ...(categoria_pai ? { categoria_pai } : {}),
  };
}

function normalizeCategoriasPai(data: unknown): CategoriaPai[] {
  const raw = unwrapArray(data);
  const out: CategoriaPai[] = [];
  for (const row of raw) {
    const c = parseCategoriaPai(row);
    if (c && c.ativo) out.push(c);
  }
  return out.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

function normalizeSubcategorias(data: unknown): Subcategoria[] {
  const raw = unwrapArray(data);
  const out: Subcategoria[] = [];
  for (const row of raw) {
    const s = parseSubcategoria(row);
    if (s) out.push(s);
  }
  return out.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

function parseCategoriaDetail(row: unknown): CategoriaDetail | null {
  if (!isRecord(row)) return null;
  const id = parseId(row.id);
  const nome = typeof row.nome === "string" ? row.nome.trim() : "";
  const slug = typeof row.slug === "string" ? row.slug.trim() : "";
  const categoriaPaiId = parseId(row.categoria_pai_id) ?? parseId(row.pai_id);
  if (id == null || !nome) return null;
  return {
    id,
    nome,
    slug: slug || String(id),
    ativo: row.ativo !== false,
    categoria_pai_id: categoriaPaiId,
  };
}

/** GET /v1/categorias — categorias pai da plataforma. */
export async function getCategoriasPai(): Promise<CategoriaPai[]> {
  const res = await api.get<unknown>(CATEGORIAS_ENDPOINTS.root);
  return normalizeCategoriasPai(res.data);
}

/** GET /v1/categorias/{id} — categoria pai ou subcategoria (público). */
export async function getCategoriaById(id: number | string): Promise<CategoriaDetail> {
  const res = await api.get<unknown>(`${CATEGORIAS_ENDPOINTS.root}/${id}`);
  const parsed = parseCategoriaDetail(res.data);
  if (!parsed) {
    throw new Error("Resposta inválida ao buscar categoria.");
  }
  return parsed;
}

/** GET /v1/categorias/subcategoria — subcategorias do vendedor autenticado. */
export async function getMinhasSubcategorias(
  params?: GetMinhasSubcategoriasParams,
): Promise<Subcategoria[]> {
  const query: Record<string, string | number | boolean> = {};
  if (params?.categoria_pai_id != null && Number.isFinite(params.categoria_pai_id)) {
    query.categoria_pai_id = params.categoria_pai_id;
  }
  if (params?.ativo != null) {
    query.ativo = params.ativo;
  }
  const res = await api.get<unknown>(CATEGORIAS_ENDPOINTS.subcategoria, {
    params: Object.keys(query).length ? query : undefined,
  });
  return normalizeSubcategorias(res.data);
}

/** POST /v1/categorias/subcategoria */
export async function createSubcategoria(payload: SubcategoriaCreate): Promise<Subcategoria> {
  const res = await api.post<unknown>(CATEGORIAS_ENDPOINTS.subcategoria, payload);
  const parsed = parseSubcategoria(res.data);
  if (!parsed) {
    throw new Error("Resposta inválida ao criar subcategoria.");
  }
  return parsed;
}

/** PUT /v1/categorias/subcategoria/{id} */
export async function updateSubcategoria(
  id: number | string,
  payload: SubcategoriaUpdate,
): Promise<Subcategoria> {
  const res = await api.put<unknown>(CATEGORIAS_ENDPOINTS.subcategoriaById(id), payload);
  const parsed = parseSubcategoria(res.data);
  if (!parsed) {
    throw new Error("Resposta inválida ao atualizar subcategoria.");
  }
  return parsed;
}
