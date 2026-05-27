import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  Eye,
  ImagePlus,
  Info,
  Loader2,
  Star,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  addProdutoImagens,
  deleteProdutoImagem,
  getProdutoById,
} from "@/api/endpoints/produtos.routes";
import { setProdutoImagemPrincipal } from "@/pages/vender/product-gallery-upload";
import {
  clearProductEditImageDraft,
  getProductEditImageDraftKey,
  loadProductEditImageDraft,
  saveProductEditImageDraft,
} from "@/pages/vender/product-edit-image-draft";
import {
  extractProdutoImagensViews,
  normalizeProdutoImagensGaleria,
  withoutProdutoImagem,
  withProdutoImagemPrincipal,
  type ProdutoImagemView,
} from "@/types/produto";
import { Button } from "@/components/ui/button";
import { getAxiosErrorMessage } from "@/lib/api-error";
import { notifySuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { CreateImageItem } from "@/pages/vender/vender-produto-create-utils";
import { newCreateImageId } from "@/pages/vender/vender-produto-create-utils";
import {
  filesToFileList,
  isValidProductImageExtension,
  partitionProductImageFilesAsync,
  PRODUCT_MAX_ACTIVE_IMAGES,
  validateAndNormalizeProductImageFile,
} from "@/pages/vender/product-image-validation";

export {
  filesToFileList,
  isValidProductImageExtension,
  partitionProductImageFilesAsync,
  validateAndNormalizeProductImageFile,
} from "@/pages/vender/product-image-validation";

export const PRODUCT_IMAGE_ACCEPT =
  "image/png,image/jpeg,image/jpg,image/webp,.png,.jpg,.jpeg,.webp";

export const PRODUCT_IMAGE_LABEL = "PNG, JPG, JPEG e WEBP";

/** Mensagem alinhada ao erro do backend (`tipo_de_imagem_nao_permitido`). */
export const PRODUCT_IMAGE_TYPE_ERROR =
  "Formato de imagem não permitido. Use PNG, JPEG ou WebP.";

/** @deprecated Prefira validação assíncrona em `validateAndNormalizeProductImageFile`. */
export function isValidProductImageFile(file: File): boolean {
  return isValidProductImageExtension(file);
}

export function notifyRejectedProductImageFiles(rejected: string[]): void {
  if (!rejected.length) return;
  if (rejected.length === 1) {
    toast.error(`${PRODUCT_IMAGE_TYPE_ERROR} (${rejected[0]})`);
    return;
  }
  const preview = rejected.slice(0, 3).join(", ");
  const suffix = rejected.length > 3 ? ` e mais ${rejected.length - 3}` : "";
  toast.error(`${PRODUCT_IMAGE_TYPE_ERROR} Arquivos: ${preview}${suffix}.`);
}

async function processProductImageSelection(
  fileList: FileList | File[] | null,
  onAccepted: (files: FileList) => void,
): Promise<void> {
  const { accepted, rejected } = await partitionProductImageFilesAsync(fileList);
  notifyRejectedProductImageFiles(rejected);
  const list = filesToFileList(accepted);
  if (list?.length) onAccepted(list);
}

type PendingUploadItem = {
  id: string;
  file: File;
  url: string;
};

function revokePendingUrls(items: PendingUploadItem[]) {
  for (const item of items) {
    try {
      URL.revokeObjectURL(item.url);
    } catch {
      // ignore
    }
  }
}

function ImagePreviewModal({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex min-h-[100dvh] w-full items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Visualizar foto"
      onClick={onClose}
    >
      <button
        type="button"
        className="absolute top-4 right-4 flex size-10 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20 transition hover:bg-white/20 sm:top-[max(1rem,env(safe-area-inset-top))] sm:right-[max(1rem,env(safe-area-inset-right))]"
        onClick={onClose}
        aria-label="Fechar visualização"
      >
        <X className="size-5" aria-hidden />
      </button>
      <img
        src={src}
        alt={alt}
        className="max-h-[min(85dvh,900px)] max-w-full rounded-2xl object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body,
  );
}

type ThumbnailActionsProps = {
  disabled?: boolean;
  isCover: boolean;
  canSetCover: boolean;
  showRemove?: boolean;
  onView: () => void;
  onSetCover?: () => void;
  onRemove: () => void;
  removeLabel?: string;
};

function ThumbnailActions({
  disabled,
  isCover,
  canSetCover,
  showRemove = true,
  onView,
  onSetCover,
  onRemove,
  removeLabel = "Remover",
}: ThumbnailActionsProps) {
  return (
    <div className="absolute inset-0 flex items-end justify-center gap-1 bg-gradient-to-t from-slate-950/80 via-slate-950/25 to-transparent p-2 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
      <button
        type="button"
        disabled={disabled}
        className="flex size-8 items-center justify-center rounded-lg bg-white/95 text-slate-800 shadow-sm transition hover:bg-white focus-visible:ring-2 focus-visible:ring-[#09bc8a]/40 disabled:opacity-50"
        onClick={onView}
        aria-label="Visualizar foto"
      >
        <Eye className="size-4" aria-hidden />
      </button>
      {canSetCover && onSetCover ? (
        <button
          type="button"
          disabled={disabled || isCover}
          className={cn(
            "flex size-8 items-center justify-center rounded-lg shadow-sm transition focus-visible:ring-2 focus-visible:ring-[#09bc8a]/40 disabled:opacity-50",
            isCover
              ? "bg-emerald-600 text-white"
              : "bg-white/95 text-slate-800 hover:bg-white",
          )}
          onClick={onSetCover}
          aria-label={isCover ? "Foto de capa" : "Definir como capa"}
          title={isCover ? "Capa" : "Definir como capa"}
        >
          <Star className={cn("size-4", isCover && "fill-current")} aria-hidden />
        </button>
      ) : null}
      {showRemove ? (
        <button
          type="button"
          disabled={disabled}
          className="flex size-8 items-center justify-center rounded-lg bg-red-600/95 text-white shadow-sm transition hover:bg-red-600 focus-visible:ring-2 focus-visible:ring-red-300 disabled:opacity-50"
          onClick={onRemove}
          aria-label={removeLabel}
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

const THUMB_CARD_CLASS =
  "group relative min-w-0 overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-900/[0.02]";

const IMAGES_GRID_CLASS = "grid w-full min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4";

function ImagesApiLimitNotice() {
  return (
    <div
      className="flex gap-3 rounded-2xl border border-sky-100/90 bg-sky-50/70 px-4 py-3 text-sky-950 ring-1 ring-sky-100/50"
      role="note"
    >
      <Info className="mt-0.5 size-4 shrink-0 text-sky-600" aria-hidden />
      <p className="text-xs leading-relaxed text-sky-900/90">
        Até {PRODUCT_MAX_ACTIVE_IMAGES} fotos ativas por anúncio. Visualize (olho), defina capa
        (estrela) ou exclua (lixeira). Fotos novas só entram na galeria publicada após o envio;
        ao marcar uma pendente como capa, use o envio para publicá-la como principal.
      </p>
    </div>
  );
}

type ImagesDropzoneProps = {
  variant: "empty" | "compact";
  disabled?: boolean;
  validating?: boolean;
  inputId?: string;
  onFiles: (files: FileList | null) => void;
  onBrowse: () => void;
};

function ImagesDropzone({
  variant,
  disabled,
  validating = false,
  inputId,
  onFiles,
  onBrowse,
}: ImagesDropzoneProps) {
  const blocked = disabled || validating;
  const dragHandlers = {
    onDragOver: (e: DragEvent) => {
      if (blocked) return;
      e.preventDefault();
    },
    onDrop: (e: DragEvent) => {
      if (blocked) return;
      e.preventDefault();
      onFiles(e.dataTransfer.files);
    },
  };

  if (variant === "empty") {
    return (
      <label
        htmlFor={inputId}
        className={cn(
          "block cursor-pointer rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center transition-colors hover:border-emerald-300 hover:bg-emerald-50/30 focus-within:border-emerald-300 focus-within:ring-2 focus-within:ring-[#09bc8a]/20 sm:p-10",
          blocked && "pointer-events-none opacity-60",
        )}
        {...dragHandlers}
      >
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          {validating ? (
            <Loader2 className="size-8 animate-spin text-emerald-600" aria-hidden />
          ) : (
            <UploadCloud className="size-8 text-emerald-600" aria-hidden />
          )}
        </div>
        <p className="mt-5 text-base font-semibold text-slate-900">
          {validating ? "Verificando fotos…" : "Arraste ou selecione fotos"}
        </p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">
          Use imagens nítidas com boa luz. Aceitamos{" "}
          <span className="font-medium text-slate-800">{PRODUCT_IMAGE_LABEL}</span> — várias de uma
          vez.
        </p>
        <span className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm">
          <ImagePlus className="size-4" aria-hidden />
          Escolher arquivos
        </span>
      </label>
    );
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={`Adicionar mais fotos. Solte arquivos aqui ou clique para abrir o seletor (${PRODUCT_IMAGE_LABEL}).`}
      className={cn(
        "cursor-pointer rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-4 transition-colors hover:border-emerald-200 hover:bg-emerald-50/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#09bc8a]/20 sm:p-5",
        blocked && "pointer-events-none cursor-not-allowed opacity-60",
      )}
      onClick={() => {
        if (blocked) return;
        onBrowse();
      }}
      onKeyDown={(e) => {
        if (blocked) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onBrowse();
        }
      }}
      {...dragHandlers}
    >
      <p className="text-sm font-semibold text-slate-900">
        {validating ? "Verificando fotos…" : "Adicionar mais fotos"}
      </p>
      <p className="mt-1 text-xs text-slate-600">
        Solte arquivos aqui ou clique para abrir o seletor ({PRODUCT_IMAGE_LABEL}).
      </p>
    </div>
  );
}

function CoverBadge() {
  return (
    <span className="absolute top-2 left-2 z-[1] rounded-full border border-emerald-300 bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
      Capa
    </span>
  );
}

type DraftManagerProps = {
  images: CreateImageItem[];
  principalId: string | null;
  setPrincipalId: (id: string) => void;
  handleFilesSelected: (files: FileList | null) => void;
  removeImage: (id: string) => void;
  disabled?: boolean;
  inputId?: string;
};

export function ProdutoImagesDraftManager({
  images,
  principalId,
  setPrincipalId,
  handleFilesSelected,
  removeImage,
  disabled = false,
  inputId: inputIdProp,
}: DraftManagerProps) {
  const autoId = useId();
  const inputId = inputIdProp ?? `produto-images-${autoId}`;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [previewAlt, setPreviewAlt] = useState("");
  const [validating, setValidating] = useState(false);

  const coverId = principalId ?? images[0]?.id ?? null;
  const coverIndex = coverId ? images.findIndex((im) => im.id === coverId) : -1;

  const openPreview = (src: string, alt: string) => {
    setPreviewSrc(src);
    setPreviewAlt(alt);
  };

  const onInputChange = useCallback(
    (files: FileList | null) => {
      if (!files?.length || validating) return;
      setValidating(true);
      void processProductImageSelection(files, handleFilesSelected).finally(() => {
        setValidating(false);
        if (inputRef.current) inputRef.current.value = "";
      });
    },
    [handleFilesSelected, validating],
  );

  return (
    <div className="w-full min-w-0 max-w-full space-y-4">
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={PRODUCT_IMAGE_ACCEPT}
        multiple
        className="sr-only"
        disabled={disabled || validating}
        onChange={(e) => onInputChange(e.target.files)}
      />

      {previewSrc ? (
        <ImagePreviewModal src={previewSrc} alt={previewAlt} onClose={() => setPreviewSrc(null)} />
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          {images.length > 0 ? (
            <>
              <span className="font-semibold text-slate-900">{images.length}</span>
              {images.length === 1 ? " foto selecionada" : " fotos selecionadas"}
              {coverIndex >= 0 ? (
                <span className="text-slate-500"> · capa #{coverIndex + 1}</span>
              ) : null}
            </>
          ) : (
            "Nenhuma foto selecionada ainda"
          )}
        </p>
        {images.length > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || validating}
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus className="mr-2 size-4" aria-hidden />
            Adicionar mais
          </Button>
        ) : null}
      </div>

      {!images.length ? (
        <ImagesDropzone
          variant="empty"
          inputId={inputId}
          disabled={disabled}
          validating={validating}
          onFiles={onInputChange}
          onBrowse={() => inputRef.current?.click()}
        />
      ) : (
        <ImagesDropzone
          variant="compact"
          disabled={disabled}
          validating={validating}
          onFiles={onInputChange}
          onBrowse={() => inputRef.current?.click()}
        />
      )}

      {images.length > 0 ? (
        <ul className={IMAGES_GRID_CLASS}>
          {images.map((im, idx) => {
            const isCover = coverId ? im.id === coverId : idx === 0;
            return (
              <li key={im.id} className={THUMB_CARD_CLASS}>
                <div className="relative aspect-square w-full bg-slate-100">
                  <img src={im.url} alt="" className="size-full object-cover" />
                  {isCover ? <CoverBadge /> : null}
                  <ThumbnailActions
                    disabled={disabled || validating}
                    isCover={isCover}
                    canSetCover
                    onView={() => openPreview(im.url, im.file.name)}
                    onSetCover={() => setPrincipalId(im.id)}
                    onRemove={() => removeImage(im.id)}
                    removeLabel="Remover foto selecionada"
                  />
                </div>
                <p className="truncate px-2 py-1.5 text-[10px] font-medium text-slate-600">
                  {im.file.name}
                </p>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

type EditPanelProps = {
  produtoId: string;
  imagens: ProdutoImagemView[];
  disabled?: boolean;
  /** Atualiza só a galeria no estado pai (sem refetch do produto). */
  onImagensChange?: (imagens: ProdutoImagemView[]) => void;
  /** Refetch completo — usar só quando precisar sincronizar tudo (ex.: upload). */
  onUploaded?: () => Promise<void>;
  className?: string;
  /** Sem card/título próprio — para uso dentro do wizard. */
  embedded?: boolean;
};

export type ProdutoImagesEditPanelHandle = {
  hasPendingImages: () => boolean;
  /** Publica fotos pendentes. Retorna true se não havia pendentes ou se o envio teve sucesso. */
  publishPendingImages: () => Promise<boolean>;
};

export const ProdutoImagesEditPanel = forwardRef<
  ProdutoImagesEditPanelHandle,
  EditPanelProps
>(function ProdutoImagesEditPanel(
  {
    produtoId,
    imagens,
    disabled = false,
    onImagensChange,
    onUploaded,
    className,
    embedded = false,
  },
  ref,
) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [pending, setPending] = useState<PendingUploadItem[]>([]);
  const [principalPendingId, setPrincipalPendingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [settingCapaId, setSettingCapaId] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [previewAlt, setPreviewAlt] = useState("");
  const [validating, setValidating] = useState(false);
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  const principalPendingIdRef = useRef(principalPendingId);
  principalPendingIdRef.current = principalPendingId;
  const draftReadyRef = useRef(false);
  const skipDraftSaveRef = useRef(false);
  const draftKey = useMemo(() => getProductEditImageDraftKey(produtoId), [produtoId]);

  const persistEditImageDraft = useCallback(() => {
    const items = pendingRef.current;
    const capaId = principalPendingIdRef.current;
    if (!items.length) {
      void clearProductEditImageDraft(draftKey);
      return;
    }
    void saveProductEditImageDraft(draftKey, items, capaId);
  }, [draftKey]);

  useEffect(() => {
    draftReadyRef.current = false;
    skipDraftSaveRef.current = true;
    setPending([]);
    setPrincipalPendingId(null);

    let cancelled = false;
    void loadProductEditImageDraft(draftKey).then(({ images, principalId, droppedInvalidCount }) => {
      if (cancelled) return;
      if (images.length) {
        setPending(
          images.map((im) => ({
            id: im.id,
            file: im.file,
            url: im.url,
          })),
        );
        setPrincipalPendingId(principalId);
        if (droppedInvalidCount > 0) {
          toast.error(
            droppedInvalidCount === 1
              ? "1 foto salva localmente foi removida por formato inválido."
              : `${droppedInvalidCount} fotos salvas localmente foram removidas por formato inválido.`,
          );
        }
      }
      draftReadyRef.current = true;
      skipDraftSaveRef.current = false;
    });

    return () => {
      cancelled = true;
    };
  }, [draftKey]);

  useEffect(() => {
    if (!draftReadyRef.current) return;
    if (skipDraftSaveRef.current) {
      skipDraftSaveRef.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      persistEditImageDraft();
    }, 500);

    return () => window.clearTimeout(timer);
  }, [pending, principalPendingId, persistEditImageDraft]);

  const openPreview = (src: string, alt: string) => {
    setPreviewSrc(src);
    setPreviewAlt(alt);
  };

  const gallery = useMemo(() => normalizeProdutoImagensGaleria(imagens), [imagens]);
  const hasGallery = gallery.length > 0;
  const hasPublishedCapa = gallery.some((im) => im.principal);
  const pendingCapaId =
    principalPendingId ?? (!hasGallery && pending[0] ? pending[0].id : null);
  const pendingOverridesPublishedCapa = pendingCapaId != null && hasGallery;
  const totalPhotoCount = gallery.length + pending.length;

  const patchImagens = (next: ProdutoImagemView[]) => {
    onImagensChange?.(normalizeProdutoImagensGaleria(next));
  };

  const mergeAcceptedFiles = useCallback(
    (accepted: File[]) => {
      if (!accepted.length) return;

      const next: PendingUploadItem[] = accepted.map((file) => ({
        id: newCreateImageId(),
        file,
        url: URL.createObjectURL(file),
      }));
      setPending((prev) => {
        const merged = [...prev, ...next];
        if (gallery.length + merged.length > PRODUCT_MAX_ACTIVE_IMAGES) {
          revokePendingUrls(next);
          const msg = `Máximo de ${PRODUCT_MAX_ACTIVE_IMAGES} fotos ativas por anúncio (${gallery.length} publicada${gallery.length === 1 ? "" : "s"}, ${prev.length} pendente${prev.length === 1 ? "" : "s"}).`;
          setUploadError(msg);
          toast.error(msg);
          return prev;
        }
        const isFirstPendingBatch = prev.length === 0;
        if (isFirstPendingBatch && next[0] && !hasPublishedCapa) {
          setPrincipalPendingId(next[0].id);
        }
        return merged;
      });
      setUploadError(null);
    },
    [gallery.length, hasPublishedCapa],
  );

  const addPendingFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList?.length || validating) return;
      setValidating(true);
      void partitionProductImageFilesAsync(fileList)
        .then(({ accepted, rejected }) => {
          notifyRejectedProductImageFiles(rejected);
          mergeAcceptedFiles(accepted);
        })
        .finally(() => {
          setValidating(false);
          if (inputRef.current) inputRef.current.value = "";
        });
    },
    [mergeAcceptedFiles, validating],
  );

  const removePending = useCallback(
    (id: string) => {
      setPending((prev) => {
        const found = prev.find((p) => p.id === id);
        if (found) revokePendingUrls([found]);
        const rest = prev.filter((p) => p.id !== id);
        if (principalPendingId === id) {
          setPrincipalPendingId(rest[0]?.id ?? null);
        }
        return rest;
      });
    },
    [principalPendingId],
  );

  const handleSetPendingCover = useCallback(
    (itemId: string) => {
      if (itemId === pendingCapaId) return;
      setPrincipalPendingId(itemId);
      notifySuccess(
        "Capa atualizada",
        "A foto principal do anúncio foi alterada.",
      );
    },
    [pendingCapaId],
  );

  useEffect(() => {
    return () => {
      if (draftReadyRef.current) {
        persistEditImageDraft();
      }
      revokePendingUrls(pendingRef.current);
    };
  }, [persistEditImageDraft]);

  const setCapaByGalleryIndex = async (galleryIndex: number) => {
    if (settingCapaId != null || disabled || gallery.length === 0) return;

    const imagem = gallery[galleryIndex];
    if (!imagem) return;
    if (imagem.principal && !pendingOverridesPublishedCapa) return;

    setPrincipalPendingId(null);
    if (imagem.id == null) {
      toast.error(
        "Não foi possível definir esta foto como capa (identificador ausente). Atualize a página e tente de novo.",
      );
      return;
    }

    const previous = gallery;
    const optimistic = withProdutoImagemPrincipal(gallery, imagem.id);
    patchImagens(optimistic);
    setSettingCapaId(imagem.id);
    setUploadError(null);

    try {
      await setProdutoImagemPrincipal(produtoId, imagem.id);
      notifySuccess("Capa atualizada", "A foto principal do anúncio foi alterada.");
    } catch (err) {
      patchImagens(previous);
      const msg = getAxiosErrorMessage(err, "Não foi possível definir a foto de capa.");
      setUploadError(msg);
      toast.error(msg);
    } finally {
      setSettingCapaId(null);
    }
  };

  const publishPendingImages = useCallback(
    async (options?: { showSuccessToast?: boolean }): Promise<ProdutoImagemView[]> => {
      const pendingSnapshot = [...pendingRef.current];
      if (!pendingSnapshot.length) {
        throw new Error("Nenhuma foto nova para enviar.");
      }

      const capaId =
        principalPendingId ??
        (gallery.length === 0 && pendingSnapshot[0] ? pendingSnapshot[0].id : null);
      const capaPendingIndex = capaId
        ? pendingSnapshot.findIndex((p) => p.id === capaId)
        : -1;

      const normalizedFiles: File[] = [];
      const invalidNames: string[] = [];
      for (const item of pendingSnapshot) {
        const normalized = await validateAndNormalizeProductImageFile(item.file);
        if (normalized) normalizedFiles.push(normalized);
        else invalidNames.push(item.file.name);
      }
      if (invalidNames.length > 0) {
        notifyRejectedProductImageFiles(invalidNames);
      }
      if (!normalizedFiles.length) {
        throw new Error("Nenhuma foto válida para enviar.");
      }

      if (gallery.length + normalizedFiles.length > PRODUCT_MAX_ACTIVE_IMAGES) {
        throw new Error(
          `Máximo de ${PRODUCT_MAX_ACTIVE_IMAGES} fotos ativas por anúncio. Você já tem ${gallery.length} publicada${gallery.length === 1 ? "" : "s"} e tentou enviar ${normalizedFiles.length}.`,
        );
      }

      const fd = new FormData();
      for (const file of normalizedFiles) {
        fd.append("imagens", file);
      }
      await addProdutoImagens(produtoId, fd, {
        substituir_imagens: false,
        imagem_principal_index: capaPendingIndex >= 0 ? capaPendingIndex : undefined,
      });

      const pRes = await getProdutoById(produtoId);
      const freshGallery = extractProdutoImagensViews(pRes.data);

      revokePendingUrls(pendingSnapshot);
      setPending([]);
      setPrincipalPendingId(null);
      skipDraftSaveRef.current = true;
      void clearProductEditImageDraft(draftKey);

      if (onImagensChange) {
        patchImagens(freshGallery);
      } else {
        await onUploaded?.();
      }

      if (options?.showSuccessToast !== false) {
        notifySuccess(
          pendingSnapshot.length === 1 ? "Foto enviada" : "Fotos enviadas",
          "A galeria do anúncio foi atualizada.",
        );
      }

      return freshGallery;
    },
    [draftKey, gallery.length, onImagensChange, onUploaded, principalPendingId, produtoId],
  );

  useImperativeHandle(
    ref,
    () => ({
      hasPendingImages: () => pendingRef.current.length > 0,
      publishPendingImages: async () => {
        if (!pendingRef.current.length) return true;
        setUploading(true);
        setUploadError(null);
        try {
          await publishPendingImages({ showSuccessToast: true });
          return true;
        } catch (err) {
          const msg = getAxiosErrorMessage(err, "Não foi possível enviar as fotos.");
          setUploadError(msg);
          toast.error(msg);
          return false;
        } finally {
          setUploading(false);
        }
      },
    }),
    [publishPendingImages],
  );

  const deletePublished = async (imagem: ProdutoImagemView) => {
    if (deletingId != null || disabled || uploading) return;

    if (imagem.id == null) {
      toast.error(
        "Não foi possível excluir esta foto (identificador ausente). Atualize a página e tente de novo.",
      );
      return;
    }

    const imagemId = imagem.id;
    const pendingNow = pendingRef.current;
    const isLastPublishedOnServer = gallery.length === 1;
    let gallerySnapshot = gallery;

    if (isLastPublishedOnServer && pendingNow.length === 0) {
      toast.error("Não é possível excluir a única foto do anúncio.");
      return;
    }

    if (isLastPublishedOnServer && pendingNow.length > 0) {
      setUploading(true);
      setUploadError(null);
      try {
        gallerySnapshot = await publishPendingImages({ showSuccessToast: false });
        const stillOnServer = gallerySnapshot.some((im) => im.id === imagemId);
        if (!stillOnServer) {
          notifySuccess(
            "Foto removida",
            "A nova foto substituiu a anterior e passou a ser a capa do anúncio.",
          );
          return;
        }
      } catch (err) {
        const msg = getAxiosErrorMessage(
          err,
          "Envie a nova foto (como capa) antes de excluir a antiga.",
        );
        setUploadError(msg);
        toast.error(msg);
        return;
      } finally {
        setUploading(false);
      }
    } else if (totalPhotoCount <= 1) {
      toast.error("Não é possível excluir a única foto do anúncio.");
      return;
    }

    const previous = gallerySnapshot;
    const optimistic = withoutProdutoImagem(gallerySnapshot, imagemId);
    patchImagens(optimistic);
    setDeletingId(imagemId);
    setUploadError(null);

    try {
      const res = await deleteProdutoImagem(produtoId, imagemId);
      notifySuccess("Foto removida", res.data?.message ?? "A imagem foi excluída da galeria.");
    } catch (err) {
      patchImagens(previous);
      const msg = getAxiosErrorMessage(err, "Não foi possível excluir a foto.");
      setUploadError(msg);
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const onInputChange = (files: FileList | null) => {
    addPendingFiles(files);
  };

  const editInputId = `edit-produto-imagens-${produtoId}`;
  const dropDisabled =
    disabled ||
    validating ||
    uploading ||
    deletingId != null ||
    settingCapaId != null;
  const showEmptyDropzone = !hasGallery && pending.length === 0;

  const counterRow = (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-600">
        {hasGallery || pending.length > 0 ? (
          <>
            {hasGallery ? (
              <>
                <span className="font-semibold text-slate-900">{gallery.length}</span>
                {gallery.length === 1 ? " foto publicada" : " fotos publicadas"}
              </>
            ) : null}
            {pending.length > 0 ? (
              <span className={hasGallery ? "text-slate-500" : ""}>
                {hasGallery ? " · " : ""}
                <span className={hasGallery ? "" : "font-semibold text-slate-900"}>
                  {pending.length}
                </span>
                {pending.length === 1 ? " nova (não enviada)" : " novas (não enviadas)"}
              </span>
            ) : null}
            {uploading ? <span className="text-slate-500"> · enviando…</span> : null}
          </>
        ) : (
          "Nenhuma foto publicada ainda"
        )}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {hasGallery || pending.length > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={dropDisabled}
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus className="mr-2 size-4" aria-hidden />
            Adicionar mais
          </Button>
        ) : null}
      </div>
    </div>
  );

  const galleryGrid =
    hasGallery || pending.length > 0 ? (
      <ul className={IMAGES_GRID_CLASS}>
        {gallery.map((imagem, idx) => {
          const isCover = imagem.principal && !pendingOverridesPublishedCapa;
          const isDeleting = imagem.id != null && deletingId === imagem.id;
          const isSettingCapa = imagem.id != null && settingCapaId === imagem.id;
          const canDelete = totalPhotoCount > 1;
          return (
            <li key={imagem.id ?? `pub-${imagem.url}-${idx}`} className={THUMB_CARD_CLASS}>
              <div className="relative aspect-square w-full bg-slate-100">
                <img src={imagem.url} alt="" className="size-full object-cover" />
                {isCover ? <CoverBadge /> : null}
                {isDeleting ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40">
                    <Loader2 className="size-6 animate-spin text-white" aria-hidden />
                  </div>
                ) : null}
                <ThumbnailActions
                  disabled={dropDisabled || isDeleting || isSettingCapa}
                  isCover={isCover}
                  canSetCover
                  showRemove={canDelete}
                  onView={() => openPreview(imagem.url, `Foto ${idx + 1}`)}
                  onSetCover={() => void setCapaByGalleryIndex(idx)}
                  onRemove={() => void deletePublished(imagem)}
                  removeLabel="Excluir foto"
                />
              </div>
              <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                <p className="min-w-0 truncate text-[10px] font-medium text-slate-600">
                  Foto {idx + 1}
                </p>
              </div>
            </li>
          );
        })}
        {pending.map((item) => {
          const isCover = item.id === pendingCapaId;
          return (
            <li key={item.id} className={THUMB_CARD_CLASS}>
              <div className="relative aspect-square w-full bg-slate-100">
                <img src={item.url} alt="" className="size-full object-cover" />
                {isCover ? <CoverBadge /> : null}
                <ThumbnailActions
                  disabled={dropDisabled}
                  isCover={isCover}
                  canSetCover
                  onView={() => openPreview(item.url, item.file.name)}
                  onSetCover={() => handleSetPendingCover(item.id)}
                  onRemove={() => removePending(item.id)}
                  removeLabel="Remover antes do envio"
                />
              </div>
              <p className="truncate px-2 py-1.5 text-[10px] font-medium text-slate-600">
                {item.file.name}
              </p>
            </li>
          );
        })}
      </ul>
    ) : null;

  const stepContent = (
    <div className="w-full min-w-0 max-w-full space-y-4">
      <input
        id={embedded ? editInputId : undefined}
        ref={inputRef}
        type="file"
        accept={PRODUCT_IMAGE_ACCEPT}
        multiple
        className="sr-only"
        disabled={dropDisabled}
        onChange={(e) => onInputChange(e.target.files)}
      />

      <div className="space-y-2">
        {counterRow}
        <ImagesApiLimitNotice />
      </div>

      {galleryGrid}

      {showEmptyDropzone ? (
        <ImagesDropzone
          variant="empty"
          inputId={embedded ? editInputId : undefined}
          disabled={dropDisabled}
          validating={validating}
          onFiles={onInputChange}
          onBrowse={() => inputRef.current?.click()}
        />
      ) : (
        <ImagesDropzone
          variant="compact"
          disabled={dropDisabled}
          validating={validating}
          onFiles={onInputChange}
          onBrowse={() => inputRef.current?.click()}
        />
      )}

      {uploadError ? (
        <p
          className="rounded-2xl border border-red-200/90 bg-red-50/90 px-4 py-3 text-sm text-red-900"
          role="alert"
        >
          {uploadError}
        </p>
      ) : null}
    </div>
  );

  const standaloneHeader = !embedded ? (
    <div className="border-b border-slate-100/90 bg-gradient-to-br from-slate-50/90 via-white to-emerald-50/25 px-4 py-5 sm:px-6">
      <h2
        id="produto-edit-images-heading"
        className="text-lg font-bold tracking-tight text-[#0c1b33]"
      >
        Fotografias do produto
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Gerencie a galeria publicada e envie novas fotos do anúncio.
      </p>
    </div>
  ) : null;

  return (
    <>
      {previewSrc ? (
        <ImagePreviewModal src={previewSrc} alt={previewAlt} onClose={() => setPreviewSrc(null)} />
      ) : null}
      {embedded ? (
        <div className={cn("w-full min-w-0", className)}>{stepContent}</div>
      ) : (
        <section
          className={cn(
            "overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_12px_48px_-16px_rgba(12,27,51,0.14)] ring-1 ring-slate-900/[0.04]",
            className,
          )}
          aria-labelledby="produto-edit-images-heading"
        >
          {standaloneHeader}
          <div className="px-4 py-5 sm:px-6 sm:py-6">{stepContent}</div>
        </section>
      )}
    </>
  );
});

/** Miniaturas somente leitura (ex.: revisão na edição). */
export function ProdutoImagesReviewGrid({
  imagens,
  coverIndex = 0,
  emptyMessage = "Nenhuma foto selecionada",
  emptyHint,
}: {
  imagens: string[];
  /** Índice da foto exibida como capa (padrão: primeira da lista). */
  coverIndex?: number;
  emptyMessage?: string;
  emptyHint?: string;
}) {
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  if (!imagens.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">
        <p className="text-sm font-medium text-slate-600">{emptyMessage}</p>
        {emptyHint ? <p className="mt-1 text-xs text-slate-500">{emptyHint}</p> : null}
      </div>
    );
  }

  return (
    <>
      {previewSrc ? (
        <ImagePreviewModal
          src={previewSrc}
          alt="Foto do produto"
          onClose={() => setPreviewSrc(null)}
        />
      ) : null}
      <ul className="grid w-full min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {imagens.map((src, idx) => (
          <li
            key={`${src}-${idx}`}
            className="group relative min-w-0 overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm"
          >
            <button
              type="button"
              className="relative block aspect-square w-full bg-slate-100"
              onClick={() => setPreviewSrc(src)}
              aria-label={`Visualizar foto ${idx + 1}`}
            >
              <img src={src} alt="" className="size-full object-cover" />
              {idx === coverIndex ? <CoverBadge /> : null}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
