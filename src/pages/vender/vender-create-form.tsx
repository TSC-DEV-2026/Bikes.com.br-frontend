import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { vendedoresRoutes } from "@/api/endpoints";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAxiosErrorMessage } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { INPUT_CLASS } from "@/pages/vender/vender-produto-create-form";
import { parseVendedor, type Vendedor } from "@/types/vendedor";

type Props = {
  onCreated: (v: Vendedor) => void;
};

export function VenderCreateForm({ onCreated }: Props) {
  const [nomeLoja, setNomeLoja] = useState("");
  const [slug, setSlug] = useState("");
  const [descricao, setDescricao] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const slugPreview = slug.trim() || "sua-loja";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nome = nomeLoja.trim();
    const s = slug.trim();
    if (!nome || !s) {
      toast.error("Preencha o nome da loja e o slug.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await vendedoresRoutes.createVendedor({
        nome_loja: nome,
        slug: s,
        descricao: descricao.trim(),
      });
      if (!res.ok) {
        const msg = "Não foi possível criar a conta de vendedor.";
        setSubmitError(msg);
        toast.error(msg);
        return;
      }
      const v = parseVendedor(res.data);
      if (!v) {
        const msg = "Resposta inválida do servidor.";
        setSubmitError(msg);
        toast.error(msg);
        return;
      }
      toast.success("Conta de vendedor criada.");
      onCreated(v);
    } catch (err) {
      const msg = getAxiosErrorMessage(err, "Não foi possível criar a conta.");
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 md:text-4xl">
          Comece a vender na Bikes.com.br
        </h1>
        <p className="mt-3 text-base text-slate-600">
          Crie sua loja para anunciar produtos e gerenciar sua vitrine pelo painel do vendedor.
        </p>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <form onSubmit={(e) => void handleSubmit(e)} className="product-create-form space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Criar conta de vendedor</h2>
            <p className="mt-1 text-sm text-slate-500">
              Informe os dados básicos da sua loja. Você poderá editar depois.
            </p>
          </div>

          {submitError ? (
            <div
              role="alert"
              className="rounded-xl border border-red-200/80 bg-red-50/90 px-3 py-2.5 text-sm leading-relaxed text-red-900"
            >
              {submitError}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="create-nome-loja" className="text-sm font-medium text-slate-800">
              Nome da loja
            </Label>
            <Input
              id="create-nome-loja"
              name="nome_loja"
              value={nomeLoja}
              onChange={(e) => {
                setNomeLoja(e.target.value);
                setSubmitError(null);
              }}
              autoComplete="organization"
              disabled={submitting}
              required
              className={INPUT_CLASS}
            />
            <p className="text-xs text-slate-500">Visível para compradores na vitrine.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-slug" className="text-sm font-medium text-slate-800">
              Slug da loja
            </Label>
            <Input
              id="create-slug"
              name="slug"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSubmitError(null);
              }}
              placeholder="ex.: minha-loja"
              autoComplete="off"
              disabled={submitting}
              required
              className={INPUT_CLASS}
            />
            <p className="text-xs text-slate-500">Letras, números e hífens.</p>
            <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <span className="text-slate-500">URL: </span>
              <span className="break-all font-mono text-slate-700">
                bikes.com.br/lojas/{slugPreview}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-descricao" className="text-sm font-medium text-slate-800">
              Descrição da loja
            </Label>
            <textarea
              id="create-descricao"
              name="descricao"
              value={descricao}
              onChange={(e) => {
                setDescricao(e.target.value);
                setSubmitError(null);
              }}
              disabled={submitting}
              rows={4}
              className={cn(
                INPUT_CLASS,
                "min-h-32 h-auto resize-y py-3",
              )}
            />
            <p className="text-xs text-slate-500">Opcional, mas ajuda na busca.</p>
          </div>

          <div className="space-y-3 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                  Criando loja...
                </>
              ) : (
                "Criar minha loja"
              )}
            </button>
          </div>
        </form>

        <p className="mt-6 border-t border-slate-100 pt-5 text-center text-xs leading-relaxed text-slate-500">
          Sua conta poderá passar por análise antes da liberação completa.
        </p>
      </div>
    </div>
  );
}
