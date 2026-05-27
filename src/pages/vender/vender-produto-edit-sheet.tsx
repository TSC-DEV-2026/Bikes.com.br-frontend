import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { isProdutoCondicao, PRODUTO_CONDICAO_OPTIONS } from "@/types/produto";
import { notifySuccess } from "@/lib/toast";
import {
  type ProdutoDetalheView,
  type ProdutoSellerEditFormValues,
  applyProdutoSellerEditFormToDetalheView,
} from "@/types/produto";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disabled: boolean;
  seed: ProdutoSellerEditFormValues;
  produtoServidor: ProdutoDetalheView;
  onLiveFormChange: (valores: ProdutoSellerEditFormValues) => void;
  onCancelEdit: () => void;
  onApplied: () => void;
};

export function VenderProdutoEditSheet({
  open,
  onOpenChange,
  disabled,
  seed,
  produtoServidor,
  onLiveFormChange,
  onCancelEdit,
  onApplied,
}: Props) {
  const closeKind = useRef<"neutral" | "cancelled" | "applied">("neutral");
  const [form, setForm] = useState<ProdutoSellerEditFormValues>(seed);
  const lastSeedSerialized = useRef<string>("");

  useEffect(() => {
    if (open) closeKind.current = "neutral";
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const key = JSON.stringify(seed);
    if (key !== lastSeedSerialized.current) {
      lastSeedSerialized.current = key;
      setForm(seed);
    }
  }, [open, seed]);

  useEffect(() => {
    if (!open || disabled) return;
    onLiveFormChange(form);
  }, [form, open, disabled, onLiveFormChange]);

  function aoRootOpenChange(next: boolean) {
    if (!next && closeKind.current === "neutral") {
      lastSeedSerialized.current = "";
      onCancelEdit();
    }
    closeKind.current = "neutral";
    onOpenChange(next);
  }

  const atualizarCampo =
    <K extends keyof ProdutoSellerEditFormValues>(key: K) =>
    (v: ProdutoSellerEditFormValues[K]) => {
      setForm((f) => ({ ...f, [key]: v }));
    };

  const aoCancelar = () => {
    closeKind.current = "cancelled";
    lastSeedSerialized.current = "";
    onCancelEdit();
    aoRootOpenChange(false);
  };

  const aoSalvar = () => {
    const tituloOk = form.titulo.trim();
    if (!tituloOk) return;

    const sanitized: ProdutoSellerEditFormValues = { ...form, titulo: tituloOk };

    applyProdutoSellerEditFormToDetalheView(produtoServidor, sanitized);
    onLiveFormChange(sanitized);
    closeKind.current = "applied";
    lastSeedSerialized.current = JSON.stringify(sanitized);
    onApplied();
    notifySuccess(
      "Pré-visualização atualizada.",
      "Não há endpoint de atualização de produto no frontend: as mudanças ficam só nesta tela até o backend expor PUT/PATCH.",
    );
    aoRootOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={aoRootOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col sm:max-w-lg"
        aria-describedby={undefined}
      >
        <SheetHeader>
          <SheetTitle>Editar informações</SheetTitle>
          <SheetDescription>
            Ajuste os campos abaixo e confira o resultado na pré-visualização em tempo real. O
            salvamento no servidor só será possível quando existir rota documentada de atualização de
            produto.
          </SheetDescription>
        </SheetHeader>

        {disabled ? (
          <p className="px-4 text-sm text-destructive" role="alert">
            Edição indisponível para esta conta.
          </p>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
          <div className="space-y-2">
            <Label htmlFor="seller-edit-titulo">Título</Label>
            <Input
              id="seller-edit-titulo"
              value={form.titulo}
              onChange={(e) => atualizarCampo("titulo")(e.target.value)}
              disabled={disabled}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="seller-edit-desc">Descrição</Label>
            <textarea
              id="seller-edit-desc"
              value={form.descricao}
              onChange={(e) => atualizarCampo("descricao")(e.target.value)}
              disabled={disabled}
              rows={6}
              className={cn(
                "placeholder:text-muted-foreground w-full resize-y rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-sm",
                "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="seller-edit-preco">Preço (R$)</Label>
              <Input
                id="seller-edit-preco"
                inputMode="decimal"
                value={form.preco}
                onChange={(e) => atualizarCampo("preco")(e.target.value)}
                disabled={disabled}
                className="rounded-xl"
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seller-edit-promo">Preço promocional (opcional)</Label>
              <Input
                id="seller-edit-promo"
                inputMode="decimal"
                value={form.preco_promocional}
                onChange={(e) => atualizarCampo("preco_promocional")(e.target.value)}
                disabled={disabled}
                className="rounded-xl"
                placeholder="Vazio = sem promoção"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="seller-edit-condicao">Condição</Label>
            <select
              id="seller-edit-condicao"
              value={form.condicao}
              onChange={(e) => {
                const v = e.target.value;
                if (isProdutoCondicao(v)) atualizarCampo("condicao")(v);
              }}
              disabled={disabled}
              className={cn(
                "h-10 w-full rounded-xl border border-input bg-transparent px-3 text-sm shadow-sm",
                "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              {PRODUTO_CONDICAO_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="seller-edit-estoque">Estoque / quantidade (texto livre)</Label>
            <Input
              id="seller-edit-estoque"
              value={form.estoque_inicial}
              onChange={(e) => atualizarCampo("estoque_inicial")(e.target.value)}
              disabled={disabled}
              className="rounded-xl"
            />
            <p className="text-xs text-muted-foreground">
              Usado apenas na pré-visualização; o contrato real de estoque depende do endpoint de
              atualização.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3">
            <Checkbox
              id="seller-edit-ativo"
              checked={form.ativo}
              onCheckedChange={(c) => atualizarCampo("ativo")(c === true)}
              disabled={disabled}
            />
            <Label htmlFor="seller-edit-ativo" className="cursor-pointer text-sm font-medium">
              Produto ativo (indicador na pré-visualização)
            </Label>
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Características / indexadores:</span>{" "}
            permanecem como na API. Ajuste completo dependerá de um endpoint de atualização que
            aceite esses campos.
          </p>
        </div>

        <SheetFooter className="flex-col gap-2 sm:flex-col">
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={aoCancelar}>
              Cancelar
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={aoSalvar}
              disabled={disabled}
            >
              Salvar alterações
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground sm:text-right">
            Sem PUT/PATCH de produto no projeto: este salvar apenas confirma o preview local (o ajuste
            já aparece ao editar os campos).
          </p>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
