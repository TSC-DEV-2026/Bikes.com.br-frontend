import {
  clearProductCreateImageDraft,
  loadProductCreateImageDraft,
  saveProductCreateImageDraft,
} from "@/pages/vender/product-create-image-draft-db";
import type { CreateImageItem } from "@/pages/vender/vender-produto-create-utils";

export const PRODUCT_EDIT_IMAGE_DRAFT_VERSION = 1;

export function getProductEditImageDraftKey(produtoId: string | number): string {
  const id = String(produtoId).trim();
  return `bikes:product-edit-images-draft:v${PRODUCT_EDIT_IMAGE_DRAFT_VERSION}:produto:${id}`;
}

export type ProductEditImageDraftLoadResult = Awaited<
  ReturnType<typeof loadProductCreateImageDraft>
>;

export async function saveProductEditImageDraft(
  draftKey: string,
  pending: Array<{ id: string; file: File; url: string }>,
  principalPendingId: string | null,
): Promise<void> {
  const images: CreateImageItem[] = pending.map((item) => ({
    id: item.id,
    file: item.file,
    url: item.url,
  }));
  await saveProductCreateImageDraft(draftKey, images, principalPendingId);
}

export function loadProductEditImageDraft(
  draftKey: string,
): Promise<ProductEditImageDraftLoadResult> {
  return loadProductCreateImageDraft(draftKey);
}

export function clearProductEditImageDraft(draftKey: string): Promise<void> {
  return clearProductCreateImageDraft(draftKey);
}
