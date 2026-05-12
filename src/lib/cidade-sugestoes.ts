/** Resposta normalizada para preencher cidade, estado e país a partir de GET /enderecos/sugestoes/cidades */

export type CidadeSugestao = {
  cidade: string;
  estado: string;
  pais: string;
};

function pickStr(o: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return "";
}

/** "Dois Vizinhos - PR", "X / SP", "Curitiba (PR)", "PR — Londrina" */
export function parseCidadeUfLabel(text: string): CidadeSugestao | null {
  const t = text.trim();
  if (!t) return null;

  let m = t.match(/^(.+?)\s*[-–—/]\s*([A-Za-zÀ-ÿ]{2})\s*$/);
  if (m) {
    return {
      cidade: m[1].trim(),
      estado: m[2].toUpperCase(),
      pais: "Brasil",
    };
  }

  m = t.match(/^([A-Za-zÀ-ÿ]{2})\s*[-–—/]\s*(.+)$/);
  if (m) {
    return {
      cidade: m[2].trim(),
      estado: m[1].toUpperCase(),
      pais: "Brasil",
    };
  }

  m = t.match(/^(.+?)\s*\(\s*([A-Za-z]{2})\s*\)\s*$/);
  if (m) {
    return {
      cidade: m[1].trim(),
      estado: m[2].toUpperCase(),
      pais: "Brasil",
    };
  }

  m = t.match(/^(.+?),\s*([A-Za-z]{2})\s*$/);
  if (m) {
    return {
      cidade: m[1].trim(),
      estado: m[2].toUpperCase(),
      pais: "Brasil",
    };
  }

  return null;
}

function extractCidade(r: Record<string, unknown>): string {
  const direct = pickStr(r, [
    "cidade_nome",
    "cidade",
    "nome_cidade",
    "nome_municipio",
    "nome",
    "municipio_nome",
    "descricao",
    "municipio",
    "município",
    "localidade",
    "label",
    "titulo",
    "text",
    "value_label",
  ]);
  if (direct) return direct;

  const m = r.municipio ?? r.município;
  if (m && typeof m === "object") {
    const o = m as Record<string, unknown>;
    const s = pickStr(o, ["nome", "nome_cidade", "descricao"]);
    if (s) return s;
  }
  return "";
}

function extractEstado(r: Record<string, unknown>): string {
  /* Preferir UF (sigla) — contrato com POST de endereço costuma usar sigla. */
  const direct = pickStr(r, [
    "estado_sigla",
    "sigla_estado",
    "uf",
    "sigla",
    "estado_uf",
    "sigla_uf",
    "uf_sigla",
    "estado",
    "nome_estado",
    "estado_nome",
  ]);
  if (direct) return direct;

  const est = r.estado;
  if (est && typeof est === "object") {
    const o = est as Record<string, unknown>;
    const s = pickStr(o, ["sigla", "uf", "nome", "sigla_estado"]);
    if (s) return s;
  }

  return "";
}

function extractPais(r: Record<string, unknown>): string {
  const direct = pickStr(r, ["pais", "nome_pais", "país", "country"]);
  if (direct) return direct;

  const p = r.pais;
  if (p && typeof p === "object") {
    const o = p as Record<string, unknown>;
    const s = pickStr(o, ["nome", "nome_pais", "sigla"]);
    if (s) return s;
  }
  return "Brasil";
}

function mapObjectRow(r: Record<string, unknown>): CidadeSugestao | null {
  let cidade = extractCidade(r);
  let estado = extractEstado(r);
  const pais = extractPais(r);

  const combined = pickStr(r, ["label", "titulo", "text", "description", "nome_completo"]);
  if ((!cidade || !estado) && combined) {
    const parsed = parseCidadeUfLabel(combined);
    if (parsed) {
      if (!cidade) cidade = parsed.cidade;
      if (!estado) estado = parsed.estado;
    }
  }

  if (cidade && estado) {
    return { cidade, estado, pais: pais || "Brasil" };
  }

  if (combined && !cidade && !estado) {
    const onlyLabel = parseCidadeUfLabel(combined);
    if (onlyLabel) return onlyLabel;
  }

  return null;
}

function unwrapPayload(raw: unknown): unknown {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return raw;
    }
  }
  return raw;
}

/** Percorre objetos e encontra arrays de objetos (respostas aninhadas tipo `{ data: { result: [ ... ] } }`). */
function collectObjectArrays(val: unknown, depth: number): Record<string, unknown>[][] {
  if (depth > 10) return [];
  if (!Array.isArray(val)) {
    if (val && typeof val === "object") {
      const acc: Record<string, unknown>[][] = [];
      for (const v of Object.values(val)) {
        acc.push(...collectObjectArrays(v, depth + 1));
      }
      return acc;
    }
    return [];
  }

  if (val.length === 0) return [];

  const first = val[0];
  if (typeof first === "object" && first !== null && !Array.isArray(first)) {
    return [val as Record<string, unknown>[]];
  }

  const acc: Record<string, unknown>[][] = [];
  for (const el of val) acc.push(...collectObjectArrays(el, depth + 1));
  return acc;
}

function normalizeTopLevelKeys(raw: unknown): CidadeSugestao[] {
  let arr: unknown[] = [];
  if (Array.isArray(raw)) arr = raw;
  else if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const nested =
      o.data ??
      o.items ??
      o.sugestoes ??
      o.results ??
      o.cidades ??
      o.municipios ??
      o.registros ??
      o.lista ??
      o.content ??
      o.resultado ??
      o.payload ??
      o.values;
    if (Array.isArray(nested)) arr = nested;
  }

  return mapArrayToSugestoes(arr);
}

function mapArrayToSugestoes(arr: unknown[]): CidadeSugestao[] {
  const out: CidadeSugestao[] = [];
  for (const item of arr) {
    if (typeof item === "string") {
      const p = parseCidadeUfLabel(item);
      if (p) out.push(p);
      continue;
    }
    if (!item || typeof item !== "object") continue;
    const row = mapObjectRow(item as Record<string, unknown>);
    if (row) out.push(row);
  }
  return out;
}

export function normalizeSugestoesCidadesPayload(rawIn: unknown): CidadeSugestao[] {
  const raw = unwrapPayload(rawIn);

  const first = normalizeTopLevelKeys(raw);
  if (first.length > 0) return dedupe(first);

  const arrays = collectObjectArrays(raw, 0);
  for (const arr of arrays) {
    const mapped = mapArrayToSugestoes(arr as unknown[]);
    if (mapped.length > 0) return dedupe(mapped);
  }

  return [];
}

function dedupe(items: CidadeSugestao[]): CidadeSugestao[] {
  const seen = new Set<string>();
  const out: CidadeSugestao[] = [];
  for (const it of items) {
    const k = `${it.cidade}|${it.estado}|${it.pais}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
}
