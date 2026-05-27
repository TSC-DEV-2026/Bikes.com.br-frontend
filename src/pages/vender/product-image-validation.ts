/** Máximo de imagens ativas por produto (alinhado ao backend). */
export const PRODUCT_MAX_ACTIVE_IMAGES = 10;

/** Validação de imagens de produto (conteúdo real, não só MIME do navegador). */

export type ProductImageFormat = "png" | "jpeg" | "webp";

const MIME_BY_FORMAT: Record<ProductImageFormat, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

function extensionMatchesFormat(name: string, format: ProductImageFormat): boolean {
  const lower = name.toLowerCase();
  switch (format) {
    case "png":
      return lower.endsWith(".png");
    case "webp":
      return lower.endsWith(".webp");
    case "jpeg":
      return /\.jpe?g$/i.test(lower);
  }
}

/** Detecta formato real pelos primeiros bytes (PNG / JPEG / WebP). */
export async function detectProductImageFormat(file: File): Promise<ProductImageFormat | null> {
  try {
    const buf = await file.slice(0, 16).arrayBuffer();
    const bytes = new Uint8Array(buf);
    if (bytes.length < 12) return null;

    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
      return "png";
    }

    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return "jpeg";
    }

    if (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    ) {
      return "webp";
    }

    return null;
  } catch {
    return null;
  }
}

export async function validateAndNormalizeProductImageFile(file: File): Promise<File | null> {
  const format = await detectProductImageFormat(file);
  if (!format || !extensionMatchesFormat(file.name, format)) return null;

  const mime = MIME_BY_FORMAT[format];
  if (file.type === mime) return file;
  return new File([file], file.name, { type: mime, lastModified: file.lastModified });
}

function fileListToArray(fileList: FileList | File[]): File[] {
  if (fileList instanceof FileList) {
    const out: File[] = [];
    for (let i = 0; i < fileList.length; i += 1) {
      const file = fileList.item(i);
      if (file) out.push(file);
    }
    return out;
  }
  return fileList;
}

export async function partitionProductImageFilesAsync(
  fileList: FileList | File[] | null,
): Promise<{ accepted: File[]; rejected: string[] }> {
  if (!fileList?.length) return { accepted: [], rejected: [] };

  const accepted: File[] = [];
  const rejected: string[] = [];

  await Promise.all(
    fileListToArray(fileList).map(async (file) => {
      const normalized = await validateAndNormalizeProductImageFile(file);
      if (normalized) accepted.push(normalized);
      else rejected.push(file.name);
    }),
  );

  return { accepted, rejected };
}

export function filesToFileList(files: File[]): FileList | null {
  if (!files.length) return null;
  const dt = new DataTransfer();
  for (const file of files) {
    dt.items.add(file);
  }
  return dt.files;
}

/** Checagem síncrona fraca (extensão) — prefira `validateAndNormalizeProductImageFile`. */
export function isValidProductImageExtension(file: File): boolean {
  const name = file.name.toLowerCase();
  return /\.(png|jpe?g|webp)$/i.test(name);
}
