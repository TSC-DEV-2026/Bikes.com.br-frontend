/** Resposta de GET /v1/vendedores/me e mutações alinhadas ao contrato da API. */
export type Vendedor = {
  id: number;
  usuario_id: number;
  nome_loja: string;
  slug: string;
  descricao: string;
  ativo: boolean;
  status: string;
};

export type CreateVendedorPayload = {
  nome_loja: string;
  slug: string;
  descricao: string;
};

export type UpdateVendedorPayload = {
  nome_loja: string;
  slug: string;
  descricao: string;
  ativo: boolean;
};

export function parseVendedor(data: unknown): Vendedor | null {
  if (data == null || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const id = Number(o.id);
  if (!Number.isFinite(id)) return null;
  const usuarioId = Number(o.usuario_id);
  return {
    id,
    usuario_id: Number.isFinite(usuarioId) ? usuarioId : 0,
    nome_loja: String(o.nome_loja ?? ""),
    slug: String(o.slug ?? ""),
    descricao: typeof o.descricao === "string" ? o.descricao : String(o.descricao ?? ""),
    ativo: Boolean(o.ativo),
    status: typeof o.status === "string" ? o.status : "pending",
  };
}
