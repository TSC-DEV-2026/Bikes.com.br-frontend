import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { categoriasRoutes, marcasRoutes, paths, produtosRoutes } from "@/api/endpoints";
import { getAxiosErrorMessage } from "@/lib/api-error";
import { notifySuccess } from "@/lib/toast";
import { SUB_USAR_PAI } from "@/pages/vender/vender-produto-editor-utils";
import type { CategoriaPai, Subcategoria } from "@/types/categoria";
import type { Marca } from "@/types/marca";
import type { ProdutoCondicao } from "@/types/produto";
import {
  emptyRequiredFieldValues,
  toMainCategorySlug,
} from "@/pages/vender/category-product-requirements";
import { loadProductCreateImageDraft } from "@/pages/vender/product-create-image-draft-db";
import {
  clearProductCreateDraft,
  getProductCreateDraftKey,
  isProductCreateDraftMeaningful,
  readProductCreateDraft,
  useProductCreateDraftAutosave,
  type ProductCreateDraftPayload,
  type ProductCreateDraftScope,
} from "@/pages/vender/use-product-create-draft";
import { PRODUCT_IMAGE_TYPE_ERROR } from "@/pages/vender/vender-produto-images-manager";
import { validateAndNormalizeProductImageFile } from "@/pages/vender/product-image-validation";
import {
  CREATE_MARCA_PLACEHOLDER,
  buildCreateMeta,
  newCreateImageId,
  parseCreatedProdutoId,
  resolvePrincipalIndex,
  toEditorDraft,
  type CreateImageItem,
  type CreateIndexadorRow,
  type CreateWizardFields,
} from "@/pages/vender/vender-produto-create-utils";

const SUB_USAR_PAI_LOCAL = SUB_USAR_PAI;

export type UseVenderProdutoCreateOptions = {
  disabled?: boolean;
  cancelHref?: string;
  initialCategoriaId?: number | null;
  initialCategoriaSlug?: string | null;
  persistenceScope?: ProductCreateDraftScope;
};

export function useVenderProdutoCreate({
  disabled = false,
  cancelHref = paths.venderAnunciar(),
  initialCategoriaId = null,
  initialCategoriaSlug = null,
  persistenceScope,
}: UseVenderProdutoCreateOptions = {}) {
  const navigate = useNavigate();
  const draftKey = persistenceScope ? getProductCreateDraftKey(persistenceScope) : null;

  const [categoriasPai, setCategoriasPai] = useState<CategoriaPai[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const initialSlug = toMainCategorySlug(initialCategoriaSlug);
  const [paiIdStr, setPaiIdStr] = useState(
    initialCategoriaId != null ? String(initialCategoriaId) : "",
  );
  const [categoriaSlug, setCategoriaSlug] = useState<string | null>(initialSlug);
  const [requiredFieldValues, setRequiredFieldValues] = useState<Record<string, string>>(() =>
    initialSlug ? emptyRequiredFieldValues(initialSlug) : {},
  );
  const [categoryLocked, setCategoryLocked] = useState(Boolean(initialCategoriaId && initialSlug));
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([]);
  const [subcategoriaIdStr, setSubcategoriaIdStr] = useState("");
  const [subsLoading, setSubsLoading] = useState(false);

  const [marcaIdStr, setMarcaIdStr] = useState(CREATE_MARCA_PLACEHOLDER);
  const [marcaAtual, setMarcaAtual] = useState<Marca | null>(null);

  const [titulo, setTitulo] = useState("");
  const [slug, setSlug] = useState("");
  const [descricao, setDescricao] = useState("");
  const [preco, setPreco] = useState("");
  const [precoPromocional, setPrecoPromocional] = useState("");
  const [condicao, setCondicao] = useState<ProdutoCondicao>("novo");

  const [images, setImages] = useState<CreateImageItem[]>([]);
  const [principalId, setPrincipalId] = useState<string | null>(null);
  const [indexadorRows, setIndexadorRows] = useState<CreateIndexadorRow[]>([]);

  const [sku, setSku] = useState("");
  const [pesoGramas, setPesoGramas] = useState("");
  const [alturaCm, setAlturaCm] = useState("");
  const [larguraCm, setLarguraCm] = useState("");
  const [comprimentoCm, setComprimentoCm] = useState("");
  const [estoqueInicial, setEstoqueInicial] = useState("");
  const [ativo, setAtivo] = useState(true);

  const [submitting, setSubmitting] = useState(false);

  const [draftImagesNotice, setDraftImagesNotice] = useState(false);
  const [initialWizardStep, setInitialWizardStep] = useState<number | null>(null);
  const [draftWizardStep, setDraftWizardStep] = useState(1);
  const [draftSaveEnabled, setDraftSaveEnabled] = useState(Boolean(draftKey));

  const draftHydratedRef = useRef(false);
  const pendingSubRestoreRef = useRef<string | null>(null);
  const skipPaiSubResetRef = useRef(false);

  const imagesRef = useRef<CreateImageItem[]>([]);
  imagesRef.current = images;

  const clearProductDraft = useCallback(() => {
    if (draftKey) clearProductCreateDraft(draftKey);
    setDraftSaveEnabled(false);
  }, [draftKey]);

  const fields: CreateWizardFields = useMemo(
    () => ({
      paiIdStr,
      categoriaSlug,
      subcategoriaIdStr,
      marcaIdStr,
      titulo,
      slug,
      descricao,
      preco,
      precoPromocional,
      condicao,
      sku,
      estoqueInicial,
      pesoGramas,
      alturaCm,
      larguraCm,
      comprimentoCm,
      ativo,
      images,
      principalId,
      requiredFieldValues,
      indexadorRows,
    }),
    [
      paiIdStr,
      categoriaSlug,
      subcategoriaIdStr,
      marcaIdStr,
      titulo,
      slug,
      descricao,
      preco,
      precoPromocional,
      condicao,
      sku,
      estoqueInicial,
      pesoGramas,
      alturaCm,
      larguraCm,
      comprimentoCm,
      ativo,
      images,
      principalId,
      requiredFieldValues,
      indexadorRows,
    ],
  );

  const fieldDisabled = disabled || submitting || catalogLoading;

  useProductCreateDraftAutosave({
    enabled: draftSaveEnabled && Boolean(draftKey) && !catalogLoading,
    draftKey,
    fields,
    wizardStep: draftWizardStep,
  });

  const loadMarcas = useCallback(async () => {
    const list = await marcasRoutes.getMarcas();
    setMarcas(list);
    return list;
  }, []);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const [paiList, marcasList] = await Promise.all([
        categoriasRoutes.getCategoriasPai(),
        marcasRoutes.getMarcas(),
      ]);
      setCategoriasPai(paiList);
      setMarcas(marcasList);
    } catch (e) {
      setCatalogError(getAxiosErrorMessage(e, "Não foi possível carregar catálogos."));
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const applyDraftToState = useCallback(
    (draft: ProductCreateDraftPayload) => {
      setTitulo(draft.titulo);
      setSlug(draft.slug);
      setDescricao(draft.descricao);
      setPreco(draft.preco);
      setPrecoPromocional(draft.precoPromocional);
      setCondicao(draft.condicao);
      setSku(draft.sku);
      setEstoqueInicial(draft.estoqueInicial);
      setPesoGramas(draft.pesoGramas);
      setAlturaCm(draft.alturaCm);
      setLarguraCm(draft.larguraCm);
      setComprimentoCm(draft.comprimentoCm);
      setAtivo(draft.ativo);
      setIndexadorRows(draft.indexadorRows);
      setMarcaIdStr(draft.marcaIdStr || CREATE_MARCA_PLACEHOLDER);

      if (!categoryLocked) {
        skipPaiSubResetRef.current = true;
        pendingSubRestoreRef.current = draft.subcategoriaIdStr || null;
        setPaiIdStr(draft.paiIdStr);
        if (draft.categoriaSlug) {
          setCategoriaSlug(draft.categoriaSlug);
          setRequiredFieldValues(draft.requiredFieldValues);
        } else if (draft.paiIdStr) {
          const cat = categoriasPai.find((c) => String(c.id) === draft.paiIdStr);
          const mainFromCat = cat
            ? toMainCategorySlug(cat.slug) ?? toMainCategorySlug(cat.nome)
            : null;
          if (cat && mainFromCat) {
            setCategoriaSlug(mainFromCat);
            setRequiredFieldValues(draft.requiredFieldValues);
          } else {
            setRequiredFieldValues(draft.requiredFieldValues);
          }
        } else {
          setCategoriaSlug(null);
          setRequiredFieldValues(draft.requiredFieldValues);
        }
      } else {
        const slugForReq =
          toMainCategorySlug(draft.categoriaSlug) ??
          toMainCategorySlug(categoriaSlug) ??
          initialSlug;
        if (slugForReq) {
          setRequiredFieldValues({
            ...emptyRequiredFieldValues(slugForReq),
            ...draft.requiredFieldValues,
          });
        } else {
          setRequiredFieldValues(draft.requiredFieldValues);
        }
        pendingSubRestoreRef.current = draft.subcategoriaIdStr || null;
      }

      if (draft.principalId) setPrincipalId(draft.principalId);
    },
    [categoriasPai, categoryLocked, categoriaSlug, initialSlug],
  );

  useEffect(() => {
    if (catalogLoading || draftHydratedRef.current) return;

    const draft = draftKey ? readProductCreateDraft(draftKey) : null;
    const hasMeaningfulDraft = Boolean(draft && isProductCreateDraftMeaningful(draft));
    const needsCategoriasPai =
      hasMeaningfulDraft || Boolean(initialCategoriaId && initialSlug);
    if (needsCategoriasPai && categoriasPai.length === 0) return;

    draftHydratedRef.current = true;

    if (hasMeaningfulDraft && draft) {
      applyDraftToState(draft);
      setInitialWizardStep(draft.step);

      if (draftKey) {
        void loadProductCreateImageDraft(draftKey).then(
          ({ images: restored, principalId: restoredPrincipal, droppedInvalidCount }) => {
            if (restored.length > 0) {
              setImages(restored);
              setPrincipalId(
                restoredPrincipal ?? draft.principalId ?? restored[0]?.id ?? null,
              );
              setDraftImagesNotice(false);
            } else if (draft.hadImageCount > 0) {
              setDraftImagesNotice(true);
            }
            if (droppedInvalidCount > 0) {
              toast.error(
                `${PRODUCT_IMAGE_TYPE_ERROR} ${droppedInvalidCount === 1 ? "Uma foto do rascunho foi removida" : `${droppedInvalidCount} fotos do rascunho foram removidas`} por usar formato inválido.`,
              );
            }
          },
        );
      } else if (draft.hadImageCount > 0) {
        setDraftImagesNotice(true);
      }
      return;
    }

    if (!initialCategoriaId || !initialSlug) return;
    const found = categoriasPai.some((c) => c.id === initialCategoriaId);
    if (!found) return;
    setPaiIdStr(String(initialCategoriaId));
    setCategoriaSlug(initialSlug);
    setRequiredFieldValues(emptyRequiredFieldValues(initialSlug));
    setCategoryLocked(true);
  }, [
    applyDraftToState,
    catalogLoading,
    categoriasPai,
    draftKey,
    initialCategoriaId,
    initialSlug,
  ]);

  useEffect(() => {
    return () => {
      for (const im of imagesRef.current) {
        try {
          URL.revokeObjectURL(im.url);
        } catch {
          // ignore
        }
      }
    };
  }, []);

  useEffect(() => {
    if (skipPaiSubResetRef.current) {
      skipPaiSubResetRef.current = false;
    } else {
      setSubcategoriaIdStr("");
    }
    if (!paiIdStr) {
      setSubcategorias([]);
      return;
    }
    const paiNum = Number.parseInt(paiIdStr, 10);
    if (!Number.isFinite(paiNum)) return;

    let cancelled = false;
    setSubsLoading(true);
    void categoriasRoutes
      .getMinhasSubcategorias({ categoria_pai_id: paiNum, ativo: true })
      .then((subs) => {
        if (!cancelled) setSubcategorias(subs);
      })
      .catch((e) => {
        if (!cancelled) {
          toast.error(getAxiosErrorMessage(e, "Não foi possível carregar subcategorias."));
          setSubcategorias([]);
        }
      })
      .finally(() => {
        if (!cancelled) setSubsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [paiIdStr]);

  useEffect(() => {
    const pending = pendingSubRestoreRef.current;
    if (!pending || subsLoading) return;
    setSubcategoriaIdStr(pending);
    pendingSubRestoreRef.current = null;
  }, [paiIdStr, subcategorias, subsLoading]);

  useEffect(() => {
    if (images.length && !principalId) {
      setPrincipalId(images[0].id);
    }
    if (images.length === 0) {
      setPrincipalId(null);
    }
  }, [images, principalId]);

  const reloadSubcategorias = useCallback(async () => {
    if (!paiIdStr) return;
    const paiNum = Number.parseInt(paiIdStr, 10);
    if (!Number.isFinite(paiNum)) return;
    setSubsLoading(true);
    try {
      const subs = await categoriasRoutes.getMinhasSubcategorias({
        categoria_pai_id: paiNum,
        ativo: true,
      });
      setSubcategorias(subs);
    } catch (e) {
      toast.error(getAxiosErrorMessage(e, "Não foi possível recarregar subcategorias."));
    } finally {
      setSubsLoading(false);
    }
  }, [paiIdStr]);

  const patchDraft = useCallback((partial: Partial<ReturnType<typeof toEditorDraft>>) => {
    if (partial.titulo !== undefined) setTitulo(partial.titulo);
    if (partial.descricao !== undefined) setDescricao(partial.descricao);
    if (partial.condicao !== undefined) setCondicao(partial.condicao);
    if (partial.ativo !== undefined) setAtivo(partial.ativo);
    if (partial.categoriaPaiId !== undefined) {
      setPaiIdStr(partial.categoriaPaiId);
      setSubcategoriaIdStr("");
      if (partial.categoriaPaiId) {
        const cat = categoriasPai.find((c) => String(c.id) === partial.categoriaPaiId);
        const mainFromCat = cat
          ? toMainCategorySlug(cat.slug) ?? toMainCategorySlug(cat.nome)
          : null;
        if (cat && mainFromCat) {
          setCategoriaSlug(mainFromCat);
          setRequiredFieldValues(emptyRequiredFieldValues(mainFromCat));
        } else {
          setCategoriaSlug(null);
          setRequiredFieldValues({});
        }
      } else {
        setCategoriaSlug(null);
        setRequiredFieldValues({});
      }
    }
    if (partial.subcategoriaId !== undefined && partial.categoriaPaiId === undefined) {
      setSubcategoriaIdStr(
        partial.subcategoriaId === SUB_USAR_PAI_LOCAL ? "" : partial.subcategoriaId,
      );
    }
    if (partial.marcaId !== undefined) {
      setMarcaIdStr(partial.marcaId || CREATE_MARCA_PLACEHOLDER);
    }
    if (partial.preco !== undefined) setPreco(partial.preco);
    if (partial.preco_promocional !== undefined) setPrecoPromocional(partial.preco_promocional);
    if (partial.sku !== undefined) setSku(partial.sku);
    if (partial.slug !== undefined) setSlug(partial.slug);
    if (partial.peso_gramas !== undefined) setPesoGramas(partial.peso_gramas);
    if (partial.altura_cm !== undefined) setAlturaCm(partial.altura_cm);
    if (partial.largura_cm !== undefined) setLarguraCm(partial.largura_cm);
    if (partial.comprimento_cm !== undefined) setComprimentoCm(partial.comprimento_cm);
    if (partial.estoque_inicial !== undefined) setEstoqueInicial(partial.estoque_inicial);
  }, [categoriasPai, reloadSubcategorias]);

  const draft = useMemo(() => toEditorDraft(fields), [fields]);

  const revokeUrls = useCallback((items: CreateImageItem[]) => {
    for (const im of items) {
      try {
        URL.revokeObjectURL(im.url);
      } catch {
        // ignore
      }
    }
  }, []);

  const handleFilesSelected = useCallback((fileList: FileList | null) => {
    if (!fileList?.length) return;

    const accepted: File[] = [];
    for (let i = 0; i < fileList.length; i += 1) {
      const file = fileList.item(i);
      if (file) accepted.push(file);
    }
    if (!accepted.length) return;

    const next: CreateImageItem[] = accepted.map((file) => ({
      id: newCreateImageId(),
      file,
      url: URL.createObjectURL(file),
    }));

    setImages((prev) => {
      const merged = [...prev, ...next];
      if (prev.length === 0 && next[0]) {
        setPrincipalId(next[0].id);
      }
      return merged;
    });
  }, []);

  const removeImage = useCallback(
    (id: string) => {
      setImages((prev) => {
        const found = prev.find((p) => p.id === id);
        if (found) revokeUrls([found]);
        const rest = prev.filter((p) => p.id !== id);
        if (principalId === id && rest[0]) {
          setPrincipalId(rest[0].id);
        }
        return rest;
      });
    },
    [principalId, revokeUrls],
  );

  const submitCreate = useCallback(async () => {
    if (fieldDisabled) return false;

    const normalizedImages: File[] = [];
    const invalidNames: string[] = [];
    for (const im of images) {
      const normalized = await validateAndNormalizeProductImageFile(im.file);
      if (normalized) normalizedImages.push(normalized);
      else invalidNames.push(im.file.name);
    }
    if (invalidNames.length > 0) {
      toast.error(
        `${PRODUCT_IMAGE_TYPE_ERROR} Remova ou substitua: ${invalidNames.join(", ")}.`,
      );
      return false;
    }

    const meta = buildCreateMeta(fields);
    if (!meta) return false;

    const imagens = normalizedImages.length > 0 ? normalizedImages : undefined;

    setSubmitting(true);
    try {
      const res = await produtosRoutes.createProdutoMultipart({ meta, imagens });
      const id = parseCreatedProdutoId(res.data);
      clearProductDraft();
      notifySuccess("Produto cadastrado", "O anúncio foi publicado com sucesso.");
      if (id != null) {
        navigate(`/produtos/${id}`, { replace: false });
      } else {
        navigate(paths.minhaLoja(), { replace: false });
      }
      return true;
    } catch (err) {
      toast.error(getAxiosErrorMessage(err, "Não foi possível cadastrar o produto."));
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [clearProductDraft, fieldDisabled, fields, images, navigate]);

  const principalIndex = resolvePrincipalIndex(fields);

  const catalogProps = {
    draft,
    patch: patchDraft,
    disabled: fieldDisabled,
    categoriasPai,
    subcategorias,
    marcas,
    marcaAtual,
    setMarcaAtual,
    subsLoading,
    loadMarcas,
    reloadSubcategorias,
    categoriaSlug,
    categoryLocked,
    setCategoryLocked,
  };

  const imageProps = {
    images,
    principalId,
    setPrincipalId,
    handleFilesSelected,
    removeImage,
    disabled: fieldDisabled,
  };

  const indexadorProps = {
    categoriaSlug,
    requiredFieldValues,
    setRequiredFieldValues,
    indexadorRows,
    setIndexadorRows,
    disabled: fieldDisabled,
  };

  const reviewExtras = {
    estoqueInicial,
    imagesCount: images.length,
    principalIndex,
    indexadorRows,
    condicao,
    ativo,
  };

  return {
    catalogLoading,
    catalogError,
    reloadCatalog: loadCatalog,
    fieldDisabled,
    submitting,
    draftKey,
    draftImagesNotice,
    initialWizardStep,
    clearProductDraft,
    setDraftWizardStep,
    fields,
    draft,
    patchDraft,
    catalogProps,
    imageProps,
    indexadorProps,
    reviewExtras,
    submitCreate,
    cancelHref,
    categoryLocked,
    setTitulo,
    setDescricao,
    setCondicao,
    setAtivo,
    setPreco,
    setPrecoPromocional,
    setSku,
    setEstoqueInicial,
    setSlug,
    setPesoGramas,
    setAlturaCm,
    setLarguraCm,
    setComprimentoCm,
  };
}

export type VenderProdutoCreateCatalog = ReturnType<typeof useVenderProdutoCreate>["catalogProps"];
