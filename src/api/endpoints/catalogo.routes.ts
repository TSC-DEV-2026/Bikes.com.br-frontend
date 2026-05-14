import api from "@/api/axiosInstance";
import type { Marca } from "@/types/marca";

export type CatalogoOption = {
  id: number;
  nome: string;
};

function unwrapArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const items = (data as Record<string, unknown>).items;
    if (Array.isArray(items)) return items;
  }
  return [];
}

function normalizeCatalogoOptions(data: unknown): CatalogoOption[] {
  const raw = unwrapArray(data);
  const out: CatalogoOption[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const idRaw = r.id;
    const id =
      typeof idRaw === "number"
        ? idRaw
        : typeof idRaw === "string"
          ? Number.parseInt(idRaw, 10)
          : NaN;
    const nome = typeof r.nome === "string" ? r.nome.trim() : "";
    if (!Number.isFinite(id) || !nome) continue;
    if (r.ativo === false) continue;
    out.push({ id, nome });
  }
  return out.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

function normalizeMarcas(data: unknown): Marca[] {
  const raw = unwrapArray(data);
  const out: Marca[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const idRaw = r.id;
    const id =
      typeof idRaw === "number"
        ? idRaw
        : typeof idRaw === "string"
          ? Number.parseInt(idRaw, 10)
          : NaN;
    const nome = typeof r.nome === "string" ? r.nome.trim() : "";
    if (!Number.isFinite(id) || !nome) continue;
    const ativo = r.ativo !== false;
    if (!ativo) continue;

    const slugRaw = typeof r.slug === "string" ? r.slug.trim() : "";
    const slug = slugRaw || String(id);

    const descricao =
      typeof r.descricao === "string" ? r.descricao : undefined;

    let logo_url: string | null = null;
    if (typeof r.logo_url === "string" && r.logo_url.trim()) {
      logo_url = r.logo_url.trim();
    }

    const marca: Marca = {
      id,
      nome,
      slug,
      ativo,
      logo_url,
    };
    if (descricao !== undefined) marca.descricao = descricao;
    out.push(marca);
  }
  return out.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

/** GET /v1/categorias — listagem pública. */
export async function listCategorias(): Promise<CatalogoOption[]> {
  const res = await api.get<unknown>("/categorias");
  return normalizeCatalogoOptions(res.data);
}

/** GET /v1/marcas — listagem pública (marcas ativas, com logo quando disponível). */
export async function listMarcas(): Promise<Marca[]> {
  const res = await api.get<unknown>("/marcas");
  return normalizeMarcas(res.data);
}
