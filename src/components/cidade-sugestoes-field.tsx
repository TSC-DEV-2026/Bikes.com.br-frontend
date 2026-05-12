import { useCallback, useEffect, useId, useRef, useState } from "react";
import { userRoutes } from "@/api/endpoints";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  type CidadeSugestao,
  normalizeSugestoesCidadesPayload,
} from "@/lib/cidade-sugestoes";

const DEBOUNCE_MS = 350;
const MIN_QUERY_LEN = 2;

/** True se o JSON parece ter dados, mas nenhuma linha virou sugestão (possível formato novo). */
function responseLooksNonEmpty(raw: unknown): boolean {
  if (Array.isArray(raw)) return raw.length > 0;
  if (raw && typeof raw === "object") {
    for (const v of Object.values(raw)) {
      if (Array.isArray(v) && v.length > 0) return true;
      if (v && typeof v === "object" && responseLooksNonEmpty(v)) return true;
    }
  }
  return false;
}

type Props = {
  cidade: string;
  estado: string;
  pais: string;
  onLocationChange: (loc: CidadeSugestao | null) => void;
  disabled?: boolean;
};

export function CidadeSugestoesField({
  cidade,
  estado,
  pais,
  onLocationChange,
  disabled,
}: Props) {
  const idBase = useId();
  const listId = `${idBase}-listbox`;

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<CidadeSugestao[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const hasSelection = Boolean(cidade.trim() && estado.trim() && pais.trim());

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const el = wrapRef.current;
      if (!el || !open) return;
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const fetchSuggestions = useCallback(async (q: string) => {
    const t = q.trim();
    if (t.length < MIN_QUERY_LEN) {
      setSuggestions([]);
      setFetchError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setFetchError(null);
    try {
      const res = await userRoutes.listSugestoesCidades(t, 15);
      const raw = await res.json();
      if (!res.ok) {
        setSuggestions([]);
        const hint =
          res.status === 401 || res.status === 403
            ? "Faça login novamente para buscar cidades."
            : res.status === 422
              ? "Termo de busca inválido para o servidor."
              : `Não foi possível carregar sugestões (${res.status}).`;
        setFetchError(hint);
        return;
      }

      const normalized = normalizeSugestoesCidadesPayload(raw);
      setSuggestions(normalized);

      if (normalized.length === 0 && responseLooksNonEmpty(raw)) {
        setFetchError(
          "O servidor devolveu dados, mas o formato não foi reconhecido. Abra DevTools → Network → Response e copie um exemplo do JSON para o time ajustar o parser."
        );
      }
    } catch {
      setSuggestions([]);
      setFetchError("Erro de rede ao buscar cidades.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasSelection) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchSuggestions(query);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, hasSelection, fetchSuggestions]);

  const handlePick = (s: CidadeSugestao) => {
    onLocationChange(s);
    setQuery("");
    setSuggestions([]);
    setFetchError(null);
    setOpen(false);
  };

  const handleAlterar = () => {
    onLocationChange(null);
    setQuery("");
    setSuggestions([]);
    setFetchError(null);
    setOpen(false);
  };

  if (hasSelection) {
    return (
      <div className="space-y-1">
        <Label>Cidade / estado / país</Label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-md border border-input bg-muted/30 px-3 py-2 text-sm">
          <div className="min-w-0">
            <span className="font-medium text-foreground">{cidade}</span>
            <span className="text-muted-foreground">
              {" "}
              · {estado} · {pais}
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={handleAlterar}
            disabled={disabled}
          >
            Alterar cidade
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative space-y-1">
      <Label htmlFor={`${idBase}-input`}>Buscar cidade *</Label>
      <Input
        id={`${idBase}-input`}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        value={query}
        disabled={disabled}
        placeholder="Digite pelo menos 2 letras para buscar"
        autoComplete="off"
        onChange={(e) => {
          const v = e.target.value;
          setQuery(v);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {loading && (
        <p className="text-xs text-muted-foreground pt-1">Buscando cidades…</p>
      )}
      {fetchError && (
        <p className="text-xs text-destructive pt-1" role="alert">
          {fetchError}
        </p>
      )}
      {open && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border border-input bg-popover text-popover-foreground shadow-md"
        >
          {suggestions.map((s, i) => (
            <li key={`${s.cidade}-${s.estado}-${s.pais}-${i}`}>
              <button
                type="button"
                role="option"
                className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handlePick(s)}
              >
                <span className="font-medium">{s.cidade}</span>
                <span className="text-xs text-muted-foreground">
                  {s.estado} · {s.pais}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open &&
        !loading &&
        !fetchError &&
        query.trim().length >= MIN_QUERY_LEN &&
        suggestions.length === 0 && (
          <p className="text-xs text-muted-foreground pt-1">
            Nenhuma cidade encontrada. Tente outro termo.
          </p>
        )}
    </div>
  );
}
