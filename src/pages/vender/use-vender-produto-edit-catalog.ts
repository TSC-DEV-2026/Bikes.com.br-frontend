import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { categoriasRoutes, marcasRoutes } from "@/api/endpoints";
import { getAxiosErrorMessage } from "@/lib/api-error";
import type { CategoriaPai, Subcategoria } from "@/types/categoria";
import type { Marca } from "@/types/marca";
import {
  buildEditorDraft,
  enrichMarcaNaResolucao,
  resolveProdutoCategoriaMarca,
  type ProdutoSellerEditorDraft,
} from "@/pages/vender/vender-produto-editor-utils";

export function useVenderProdutoEditCatalog(
  rawPayload: unknown,
  initialProduto: Parameters<typeof buildEditorDraft>[0],
) {
  const [draft, setDraft] = useState<ProdutoSellerEditorDraft>(() =>
    buildEditorDraft(initialProduto, rawPayload),
  );
  const [categoriasPai, setCategoriasPai] = useState<CategoriaPai[]>([]);
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [marcaAtual, setMarcaAtual] = useState<Marca | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [subsLoading, setSubsLoading] = useState(false);

  const patch = useCallback((partial: Partial<ProdutoSellerEditorDraft>) => {
    setDraft((d) => ({ ...d, ...partial }));
  }, []);

  const loadMarcas = useCallback(async () => {
    const list = await marcasRoutes.getMarcas();
    setMarcas(list);
    return list;
  }, []);

  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);
    setCatalogError(null);
    void (async () => {
      try {
        const [paiList, marcasList, allSubs] = await Promise.all([
          categoriasRoutes.getCategoriasPai(),
          marcasRoutes.getMarcas(),
          categoriasRoutes.getMinhasSubcategorias(),
        ]);
        if (cancelled) return;
        setCategoriasPai(paiList);
        setMarcas(marcasList);

        const baseResolved = resolveProdutoCategoriaMarca(
          rawPayload,
          paiList,
          allSubs,
          marcasList,
        );
        const resolved = await enrichMarcaNaResolucao(baseResolved, rawPayload, marcasList);
        if (cancelled) return;
        setMarcaAtual(resolved.marcaAtual);
        setDraft((d) => ({
          ...d,
          categoriaPaiId: resolved.categoriaPaiId,
          subcategoriaId: resolved.subcategoriaId,
          marcaId: resolved.marcaId || d.marcaId,
        }));

        if (resolved.categoriaPaiId) {
          const subs = await categoriasRoutes.getMinhasSubcategorias({
            categoria_pai_id: Number.parseInt(resolved.categoriaPaiId, 10),
          });
          if (!cancelled) setSubcategorias(subs);
        }
      } catch (e) {
        if (!cancelled) {
          setCatalogError(getAxiosErrorMessage(e, "Não foi possível carregar catálogos."));
        }
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rawPayload]);

  useEffect(() => {
    if (catalogLoading) return;
    if (!draft.categoriaPaiId) {
      setSubcategorias([]);
      return;
    }
    const paiNum = Number.parseInt(draft.categoriaPaiId, 10);
    if (!Number.isFinite(paiNum)) return;
    let cancelled = false;
    setSubsLoading(true);
    void categoriasRoutes
      .getMinhasSubcategorias({ categoria_pai_id: paiNum })
      .then((subs) => {
        if (!cancelled) setSubcategorias(subs);
      })
      .catch(() => {
        if (!cancelled) setSubcategorias([]);
        toast.error("Não foi possível carregar subcategorias.");
      })
      .finally(() => {
        if (!cancelled) setSubsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [catalogLoading, draft.categoriaPaiId]);

  return {
    draft,
    patch,
    categoriasPai,
    subcategorias,
    marcas,
    marcaAtual,
    setMarcaAtual,
    catalogLoading,
    catalogError,
    subsLoading,
    loadMarcas,
  };
}
