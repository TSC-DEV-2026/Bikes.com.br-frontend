/**
 * Monta `q` e `indexador` para GET /produtos no mesmo espírito do Swagger:
 * - **Um termo:** só `q` (full-text).
 * - **Dois ou mais:** primeiro termo em `q`, o restante em `indexador`
 *   separado por vírgula (ex.: frase "Bicicleta Preta" → `q=bicicleta`,
 *   `indexador=preta`).
 * Quebra por espaços, remove vazios e deduplica sem diferenciar maiúsculas.
 */
export function produtosSearchFromUserPhrase(
  raw: string
): { q: string; indexador?: string } | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  const tokens = trimmed
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  if (tokens.length === 0) return undefined;

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const t of tokens) {
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(t);
  }

  if (unique.length === 1) {
    return { q: unique[0] };
  }

  const [first, ...rest] = unique;
  return {
    q: first,
    indexador: rest.join(","),
  };
}
