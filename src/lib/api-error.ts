import { isAxiosError } from "axios";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Extrai mensagem amigável do payload de erro do backend (FastAPI + handlers customizados). */
export function messageFromApiErrorBody(data: unknown): string | null {
  if (data == null) return null;

  if (typeof data === "string" && data.trim()) return data.trim();

  if (!isRecord(data)) return null;

  const err = data.error;
  if (isRecord(err)) {
    const detail = err.detail;
    if (typeof detail === "string" && detail.trim()) return detail.trim();
    const msg = err.message;
    if (typeof msg === "string" && msg.trim()) return msg.trim();
    const code = err.code;
    if (typeof code === "string" && code.trim()) return code.trim();
  }

  const detailTop = data.detail;
  if (typeof detailTop === "string" && detailTop.trim()) return detailTop.trim();
  if (Array.isArray(detailTop)) {
    try {
      return detailTop
        .map((item: unknown) => {
          if (!isRecord(item)) return String(item);
          const loc = Array.isArray(item.loc) ? item.loc.filter(Boolean).join(".") : "";
          const msg = typeof item.msg === "string" ? item.msg : "";
          return loc ? `${loc}: ${msg}` : msg || JSON.stringify(item);
        })
        .filter(Boolean)
        .join(" • ");
    } catch {
      return JSON.stringify(detailTop);
    }
  }

  const message = data.message;
  if (typeof message === "string" && message.trim()) return message.trim();

  const validationDetails = isRecord(data.error) ? data.error.details : undefined;
  if (Array.isArray(validationDetails)) {
    try {
      return validationDetails
        .map((item: unknown) => {
          if (!isRecord(item)) return String(item);
          const loc = Array.isArray(item.loc) ? item.loc.filter(Boolean).join(".") : "";
          const msg = typeof item.msg === "string" ? item.msg : "";
          return loc ? `${loc}: ${msg}` : msg || JSON.stringify(item);
        })
        .filter(Boolean)
        .join(" • ");
    } catch {
      return null;
    }
  }

  return null;
}

/** Mensagem a partir de uma resposta Axios (erro HTTP ou rede). */
export function getAxiosErrorMessage(error: unknown, fallback = "Ocorreu um erro inesperado."): string {
  if (isAxiosError(error)) {
    const body = error.response?.data;
    const parsed = messageFromApiErrorBody(body);
    if (parsed) return parsed;
    if (error.message) return error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
