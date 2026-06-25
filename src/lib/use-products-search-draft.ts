import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Mantém rascunho do input de busca separado do termo commitado na URL.
 * Sincroniza URL → rascunho só quando `q` muda externamente e o campo não está focado,
 * evitando apagar texto digitado após limpar busca ou ao mudar filtros.
 */
export function useProductsSearchDraft(urlTerm: string) {
  const [draft, setDraft] = useState(urlTerm);
  const inputRef = useRef<HTMLInputElement>(null);
  const committedUrlTermRef = useRef(urlTerm);

  useEffect(() => {
    if (committedUrlTermRef.current === urlTerm) return;

    const inputFocused =
      inputRef.current !== null &&
      document.activeElement === inputRef.current;

    committedUrlTermRef.current = urlTerm;

    if (inputFocused) return;
    setDraft(urlTerm);
  }, [urlTerm]);

  const markCommitted = useCallback((term: string) => {
    committedUrlTermRef.current = term;
  }, []);

  return { draft, setDraft, inputRef, markCommitted };
}
