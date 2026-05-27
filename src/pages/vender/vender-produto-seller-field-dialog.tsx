import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  isProdutoCondicao,
  PRODUTO_CONDICAO_OPTIONS,
  type ProdutoCondicao,
} from "@/types/produto";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ProdutoSellerEditFormValues } from "@/types/produto";

export type SellerPreviewDialogField =
  | "titulo"
  | "descricao"
  | "preco"
  | "preco_promocional"
  | "condicao"
  | "ativo";

const DIALOG_TITLE: Record<SellerPreviewDialogField, string> = {
  titulo: "Editar título",
  descricao: "Editar descrição",
  preco: "Editar preço",
  preco_promocional: "Editar preço promocional",
  condicao: "Editar condição",
  ativo: "Visibilidade no preview",
};

function parseMoney(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

type Props = {
  open: boolean;
  field: SellerPreviewDialogField | null;
  form: ProdutoSellerEditFormValues | null;
  onClose: () => void;
  onConfirm: (patch: Partial<ProdutoSellerEditFormValues>) => void;
};

export function VenderProdutoSellerFieldDialog({
  open,
  field,
  form,
  onClose,
  onConfirm,
}: Props) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [preco, setPreco] = useState("");
  const [precoPromo, setPrecoPromo] = useState("");
  const [condicao, setCondicao] = useState<ProdutoCondicao>("novo");
  const [ativo, setAtivo] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !field || !form) return;
    setError(null);
    switch (field) {
      case "titulo":
        setTitulo(form.titulo);
        break;
      case "descricao":
        setDescricao(form.descricao);
        break;
      case "preco":
        setPreco(form.preco);
        break;
      case "preco_promocional":
        setPrecoPromo(form.preco_promocional);
        break;
      case "condicao":
        setCondicao(form.condicao);
        break;
      case "ativo":
        setAtivo(form.ativo);
        break;
      default:
        break;
    }
  }, [open, field, form]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !field || !form) return null;

  function handleConfirm() {
    setError(null);
    if (field === "titulo") {
      const t = titulo.trim();
      if (!t) {
        setError("Informe um título.");
        return;
      }
      onConfirm({ titulo: t });
      onClose();
      return;
    }
    if (field === "descricao") {
      const d = descricao.trim();
      if (!d) {
        setError("Informe uma descrição.");
        return;
      }
      onConfirm({ descricao: d });
      onClose();
      return;
    }
    if (field === "preco") {
      const n = parseMoney(preco);
      if (n == null) {
        setError("Informe um preço válido.");
        return;
      }
      if (n < 0) {
        setError("O preço deve ser maior ou igual a zero.");
        return;
      }
      onConfirm({ preco: preco.trim() });
      onClose();
      return;
    }
    if (field === "preco_promocional") {
      const raw = precoPromo.trim();
      if (!raw) {
        onConfirm({ preco_promocional: "" });
        onClose();
        return;
      }
      const n = parseMoney(raw);
      if (n == null) {
        setError("Informe um valor válido ou deixe em branco.");
        return;
      }
      if (n < 0) {
        setError("O preço promocional deve ser maior ou igual a zero.");
        return;
      }
      onConfirm({ preco_promocional: raw });
      onClose();
      return;
    }
    if (field === "condicao") {
      onConfirm({ condicao });
      onClose();
      return;
    }
    if (field === "ativo") {
      onConfirm({ ativo });
      onClose();
    }
  }

  const confirmLabel =
    field === "titulo"
      ? "Aplicar título"
      : field === "descricao"
        ? "Aplicar descrição"
        : field === "preco"
          ? "Aplicar preço"
          : field === "preco_promocional"
            ? "Aplicar promoção"
            : field === "condicao"
              ? "Aplicar condição"
              : "Aplicar";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="seller-field-dialog-title"
        className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          onClick={onClose}
          aria-label="Fechar"
        >
          <X className="size-4" aria-hidden />
        </button>

        <h2
          id="seller-field-dialog-title"
          className="pr-10 text-lg font-semibold tracking-tight text-foreground"
        >
          {DIALOG_TITLE[field]}
        </h2>

        <div className="mt-4 space-y-4">
          {field === "titulo" ? (
            <div className="space-y-2">
              <Label htmlFor="dlg-titulo">Título do produto</Label>
              <Input
                id="dlg-titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="rounded-xl"
                autoFocus
              />
            </div>
          ) : null}

          {field === "descricao" ? (
            <div className="space-y-2">
              <Label htmlFor="dlg-desc">Descrição do produto</Label>
              <textarea
                id="dlg-desc"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className={cn(
                  "min-h-[180px] w-full resize-y rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-sm",
                  "placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-emerald-100 focus-visible:outline-none",
                )}
                autoFocus
              />
            </div>
          ) : null}

          {field === "preco" ? (
            <div className="space-y-2">
              <Label htmlFor="dlg-preco">Preço</Label>
              <Input
                id="dlg-preco"
                inputMode="decimal"
                value={preco}
                onChange={(e) => setPreco(e.target.value)}
                placeholder="0,00"
                className="rounded-xl"
                autoFocus
              />
            </div>
          ) : null}

          {field === "preco_promocional" ? (
            <div className="space-y-2">
              <Label htmlFor="dlg-promo">Preço promocional (opcional)</Label>
              <Input
                id="dlg-promo"
                inputMode="decimal"
                value={precoPromo}
                onChange={(e) => setPrecoPromo(e.target.value)}
                placeholder="Vazio = sem promoção"
                className="rounded-xl"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Deixe em branco para remover a promoção neste preview local.
              </p>
            </div>
          ) : null}

          {field === "condicao" ? (
            <div className="space-y-2">
              <Label htmlFor="dlg-cond">Condição</Label>
              <select
                id="dlg-cond"
                value={condicao}
                onChange={(e) => {
                  const v = e.target.value;
                  if (isProdutoCondicao(v)) setCondicao(v);
                }}
                className="h-10 w-full rounded-xl border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-emerald-100 focus-visible:outline-none"
              >
                {PRODUTO_CONDICAO_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {field === "ativo" ? (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3">
              <Label htmlFor="dlg-ativo" className="text-sm font-medium text-foreground">
                Produto ativo na vitrine
              </Label>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  id="dlg-ativo"
                  type="checkbox"
                  checked={ativo}
                  onChange={(e) => setAtivo(e.target.checked)}
                  className="size-4 rounded border-emerald-400 accent-emerald-600"
                />
                <span className="text-sm text-muted-foreground">
                  Exibir como ativo neste preview. Alteração apenas local até existir endpoint de
                  atualização.
                </span>
              </label>
            </div>
          ) : null}

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
