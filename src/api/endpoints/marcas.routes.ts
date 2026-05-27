import { isAxiosError } from "axios";

import api from "@/api/axiosInstance";
import type { Marca, MarcaCreateMeta } from "@/types/marca";

export const MARCAS_ENDPOINTS = {
  root: "/marcas",
  byId: (id: number | string) => `/marcas/${id}`,
} as const;

function unwrapArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const items = (data as Record<string, unknown>).items;
    if (Array.isArray(items)) return items;
  }
  return [];
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function parseId(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number.parseInt(v, 10);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function normalizeMarcas(data: unknown): Marca[] {
  const raw = unwrapArray(data);
  const out: Marca[] = [];
  for (const row of raw) {
    if (!isRecord(row)) continue;
    const id = parseId(row.id);
    const nome = typeof row.nome === "string" ? row.nome.trim() : "";
    if (id == null || !nome) continue;
    const ativo = row.ativo !== false;
    if (!ativo) continue;

    const slugRaw = typeof row.slug === "string" ? row.slug.trim() : "";
    const slug = slugRaw || String(id);
    const descricao =
      typeof row.descricao === "string" ? row.descricao.trim() : "";

    let logo_url: string | null = null;
    if (typeof row.logo_url === "string" && row.logo_url.trim()) {
      logo_url = row.logo_url.trim();
    }

    out.push({
      id,
      nome,
      slug,
      descricao,
      ativo,
      logo_url,
    });
  }
  return out.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

/** Parse uma marca individual (inclui inativas; usado em GET /marcas/{id}). */
function parseMarcaDetalhe(data: unknown): Marca | null {
  if (!isRecord(data)) {
    if (Array.isArray(data) && data[0]) return parseMarcaDetalhe(data[0]);
    return null;
  }
  const nested = data.data ?? data.marca ?? data.item;
  const row = isRecord(nested) ? nested : data;

  const id = parseId(row.id);
  const nome = typeof row.nome === "string" ? row.nome.trim() : "";
  if (id == null || !nome) return null;

  const slugRaw = typeof row.slug === "string" ? row.slug.trim() : "";
  const descricao = typeof row.descricao === "string" ? row.descricao.trim() : "";
  let logo_url: string | null = null;
  if (typeof row.logo_url === "string" && row.logo_url.trim()) {
    logo_url = row.logo_url.trim();
  }

  return {
    id,
    nome,
    slug: slugRaw || String(id),
    descricao,
    ativo: row.ativo !== false,
    logo_url,
  };
}

function parseMarca(data: unknown): Marca | null {
  const list = normalizeMarcas(Array.isArray(data) ? data : [data]);
  if (list.length) return list[0];
  return parseMarcaDetalhe(data);
}

/** GET /v1/marcas — marcas ativas do catálogo global. */
export async function getMarcas(): Promise<Marca[]> {
  const res = await api.get<unknown>(MARCAS_ENDPOINTS.root);
  return normalizeMarcas(res.data);
}

type CreateMarcaInput = {
  meta: MarcaCreateMeta;
  /** Opcional: alguns ambientes aceitam criação sem logo. */
  logo?: File | Blob | null;
};

/** POST /v1/marcas — cria marca via multipart/form-data (meta + logo opcional). */
export async function createMarca({ meta, logo }: CreateMarcaInput): Promise<Marca> {
  const formData = new FormData();
  formData.append("meta", JSON.stringify(meta));
  if (logo) {
    formData.append("logo", logo);
  }

  const res = await api.post<unknown>(MARCAS_ENDPOINTS.root, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  const parsed = parseMarca(res.data);
  if (!parsed) {
    throw new Error("Resposta inválida ao criar marca.");
  }
  return parsed;
}

/** PUT /v1/marcas/{id} — edição (ex.: dono da marca). */
export function updateMarca(id: number | string, payload: Partial<MarcaCreateMeta>) {
  return api.put<unknown>(MARCAS_ENDPOINTS.byId(id), payload);
}

/** GET /v1/marcas/{id} */
export function getMarcaById(id: number | string) {
  return api.get<unknown>(MARCAS_ENDPOINTS.byId(id));
}

/** GET /v1/marcas/{id} — retorna marca mesmo se inativa; null em 404. */
export async function fetchMarcaById(id: number | string): Promise<Marca | null> {
  try {
    const res = await getMarcaById(id);
    return parseMarcaDetalhe(res.data);
  } catch (e) {
    if (isAxiosError(e) && e.response?.status === 404) return null;
    throw e;
  }
}
