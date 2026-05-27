import { validateAndNormalizeProductImageFile } from "@/pages/vender/product-image-validation";
import type { CreateImageItem } from "@/pages/vender/vender-produto-create-utils";

const DB_NAME = "bikes-product-create-draft";
const DB_VERSION = 1;
const STORE_NAME = "images";
const DRAFT_KEY_INDEX = "draftKey";
const IMAGE_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type DraftImageRecord = {
  id: string;
  draftKey: string;
  name: string;
  type: string;
  size: number;
  lastModified: number;
  file: Blob;
  isCover: boolean;
  order: number;
  savedAt: string;
  expiresAt: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB indisponível"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("Falha ao abrir IndexedDB"));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex(DRAFT_KEY_INDEX, "draftKey", { unique: false });
      }
    };
  });
}

function runWriteTx(fn: (store: IDBObjectStore) => void): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        fn(tx.objectStore(STORE_NAME));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error("Transação IndexedDB falhou"));
        tx.onabort = () => reject(tx.error ?? new Error("Transação IndexedDB abortada"));
      }),
  );
}

function listByDraftKey(draftKey: string): Promise<DraftImageRecord[]> {
  return openDb().then(
    (db) =>
      new Promise<DraftImageRecord[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const req = tx.objectStore(STORE_NAME).index(DRAFT_KEY_INDEX).getAll(draftKey);
        req.onsuccess = () => resolve(req.result ?? []);
        req.onerror = () => reject(req.error ?? new Error("Falha ao ler imagens do rascunho"));
        tx.onerror = () => reject(tx.error ?? new Error("Transação IndexedDB falhou"));
      }),
  );
}

function deleteByDraftKey(draftKey: string): Promise<void> {
  return listByDraftKey(draftKey).then((records) =>
    runWriteTx((store) => {
      for (const rec of records) {
        store.delete(rec.id);
      }
    }),
  );
}

function toFile(blob: Blob, rec: DraftImageRecord): File {
  return new File([blob], rec.name, {
    type: rec.type || blob.type || "application/octet-stream",
    lastModified: rec.lastModified,
  });
}

export async function saveProductCreateImageDraft(
  draftKey: string,
  images: CreateImageItem[],
  principalId: string | null,
): Promise<void> {
  if (typeof indexedDB === "undefined") return;

  const savedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + IMAGE_DRAFT_TTL_MS).toISOString();

  await deleteByDraftKey(draftKey);

  if (!images.length) return;

  await runWriteTx((store) => {
    images.forEach((im, order) => {
      const record: DraftImageRecord = {
        id: im.id,
        draftKey,
        name: im.file.name,
        type: im.file.type,
        size: im.file.size,
        lastModified: im.file.lastModified,
        file: im.file,
        isCover: principalId ? im.id === principalId : order === 0,
        order,
        savedAt,
        expiresAt,
      };
      store.put(record);
    });
  });
}

export async function loadProductCreateImageDraft(
  draftKey: string,
): Promise<{
  images: CreateImageItem[];
  principalId: string | null;
  droppedInvalidCount: number;
}> {
  if (typeof indexedDB === "undefined") {
    return { images: [], principalId: null, droppedInvalidCount: 0 };
  }

  try {
    const now = Date.now();
    const records = (await listByDraftKey(draftKey))
      .filter((rec) => {
        const exp = Date.parse(rec.expiresAt);
        return !Number.isFinite(exp) || exp > now;
      })
      .sort((a, b) => a.order - b.order);

    if (!records.length) return { images: [], principalId: null, droppedInvalidCount: 0 };

    const images: CreateImageItem[] = [];
    let droppedInvalidCount = 0;

    for (const rec of records) {
      const raw = toFile(rec.file, rec);
      const file = await validateAndNormalizeProductImageFile(raw);
      if (!file) {
        droppedInvalidCount += 1;
        continue;
      }
      images.push({
        id: rec.id,
        file,
        url: URL.createObjectURL(file),
      });
    }

    const cover = records.find((r) => r.isCover);
    const principalId =
      (cover && images.some((im) => im.id === cover.id) ? cover.id : null) ??
      images[0]?.id ??
      null;

    return { images, principalId, droppedInvalidCount };
  } catch {
    return { images: [], principalId: null, droppedInvalidCount: 0 };
  }
}

export async function clearProductCreateImageDraft(draftKey: string): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    await deleteByDraftKey(draftKey);
  } catch {
    // ignore
  }
}
