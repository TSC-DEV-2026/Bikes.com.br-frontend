import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, PackagePlus, Pencil } from "lucide-react";
import { toast } from "sonner";

import { vendedoresRoutes, paths } from "@/api/endpoints";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAxiosErrorMessage } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { parseVendedor, type Vendedor } from "@/types/vendedor";

import { INPUT_CLASS } from "@/pages/vender/vender-produto-create-form";

import { VenderMeusProdutosSection } from "./vender-meus-produtos-section";

function contaStatusIndicator(status: string): {
  description: string;
  badge: string;
  row: string;
  dot: string;
  badgeWrap: string;
} {
  const s = status.toLowerCase();
  switch (s) {
    case "pending":
      return {
        description: "Em análise pela plataforma",
        badge: "Em análise",
        row: "border-amber-200 bg-amber-50",
        dot: "bg-amber-500",
        badgeWrap: "border-amber-200 bg-white/80 text-amber-800",
      };
    case "active":
      return {
        description: "Conta aprovada",
        badge: "Aprovada",
        row: "border-emerald-200 bg-emerald-50",
        dot: "bg-emerald-500",
        badgeWrap: "border-emerald-200 bg-white/80 text-emerald-800",
      };
    case "inactive":
      return {
        description: "Conta inativa",
        badge: "Inativa",
        row: "border-slate-200 bg-slate-100",
        dot: "bg-slate-500",
        badgeWrap: "border-slate-200 bg-white/80 text-slate-700",
      };
    case "blocked":
      return {
        description: "Conta bloqueada",
        badge: "Bloqueada",
        row: "border-red-200 bg-red-50",
        dot: "bg-red-500",
        badgeWrap: "border-red-200 bg-white/80 text-red-800",
      };
    default:
      return {
        description: status || "Situação da conta",
        badge: "—",
        row: "border-slate-200 bg-slate-50",
        dot: "bg-slate-400",
        badgeWrap: "border-slate-200 bg-white/80 text-slate-700",
      };
  }
}

function vitrineIndicator(ativo: boolean): {
  description: string;
  badge: string;
  row: string;
  dot: string;
  badgeWrap: string;
} {
  if (ativo) {
    return {
      description: "Visível para venda",
      badge: "Visível",
      row: "border-sky-200 bg-sky-50",
      dot: "bg-sky-500",
      badgeWrap: "border-sky-200 bg-white/80 text-sky-800",
    };
  }
  return {
    description: "Inativa no momento",
    badge: "Inativa",
    row: "border-slate-200 bg-slate-100",
    dot: "bg-slate-400",
    badgeWrap: "border-slate-200 bg-white/80 text-slate-700",
  };
}

function InfoBlock({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-2 min-w-0 text-base font-medium leading-snug text-slate-900 sm:text-lg">
        {children}
      </div>
    </div>
  );
}
type Props = {
  vendedor: Vendedor;
  onUpdated: (v: Vendedor) => void;
};

export function VenderPanel({ vendedor, onUpdated }: Props) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [nomeLoja, setNomeLoja] = useState(vendedor.nome_loja);
  const [slug, setSlug] = useState(vendedor.slug);
  const [descricao, setDescricao] = useState(vendedor.descricao);
  const [ativo, setAtivo] = useState(vendedor.ativo);
  const [saving, setSaving] = useState(false);

  const blocked = vendedor.status.toLowerCase() === "blocked";
  const pending = vendedor.status.toLowerCase() === "pending";

  useEffect(() => {
    setNomeLoja(vendedor.nome_loja);
    setSlug(vendedor.slug);
    setDescricao(vendedor.descricao);
    setAtivo(vendedor.ativo);
  }, [vendedor]);

  const contaInd = useMemo(
    () => contaStatusIndicator(vendedor.status),
    [vendedor.status],
  );
  const vitrineInd = useMemo(() => vitrineIndicator(vendedor.ativo), [vendedor.ativo]);

  const handleCadastrarProduto = () => {
    if (!vendedor.ativo) {
      navigate(paths.minhaLoja(), { state: { aviso: "inativa" } });
      return;
    }
    navigate(paths.venderAnunciar());
  };

  const resetDraftFromProps = () => {
    setNomeLoja(vendedor.nome_loja);
    setSlug(vendedor.slug);
    setDescricao(vendedor.descricao);
    setAtivo(vendedor.ativo);
  };

  const handleCancelEdit = () => {
    resetDraftFromProps();
    setEditing(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (blocked) return;

    const nome = nomeLoja.trim();
    const s = slug.trim();
    if (!nome || !s) {
      toast.error("Preencha o nome da loja e o slug.");
      return;
    }

    setSaving(true);
    try {
      const res = await vendedoresRoutes.updateMeuVendedor({
        nome_loja: nome,
        slug: s,
        descricao: descricao.trim(),
        ativo,
      });
      if (!res.ok) {
        toast.error("Não foi possível salvar as alterações.");
        return;
      }
      const next = parseVendedor(res.data);
      if (!next) {
        toast.error("Resposta inválida do servidor.");
        return;
      }
      toast.success("Dados da loja atualizados.");
      onUpdated(next);
      setEditing(false);
    } catch (err) {
      toast.error(getAxiosErrorMessage(err, "Não foi possível salvar."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full min-w-0 space-y-6 overflow-x-hidden">
      {!editing ? (
        <>
          {blocked ? (
            <div
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm leading-relaxed text-red-900 shadow-sm"
            >
              Conta bloqueada. Entre em contato com o suporte.
            </div>
          ) : null}

          {pending ? (
            <div
              role="status"
              className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-relaxed text-amber-950 shadow-sm"
            >
              Conta em análise. Você pode acompanhar os dados da loja aqui; a venda de produtos
              pode ficar limitada até a aprovação.
            </div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-start">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                Resumo da loja
              </h2>
              <p className="mt-2 max-w-prose text-sm leading-relaxed text-slate-600">
                Informações públicas da sua vitrine. O status da conta é somente leitura; use
                &quot;Editar informações&quot; para nome, slug, descrição e visibilidade da loja.
              </p>

              <div className="mt-6 grid gap-4 sm:gap-5">
                <InfoBlock label="Nome da loja">{vendedor.nome_loja}</InfoBlock>
                <InfoBlock label="Slug público">
                  <span className="break-all">{vendedor.slug}</span>
                </InfoBlock>
                <InfoBlock label="Descrição">
                  {vendedor.descricao.trim() ? (
                    <p className="whitespace-pre-wrap font-normal leading-relaxed text-slate-800">
                      {vendedor.descricao}
                    </p>
                  ) : (
                    <span className="font-normal text-slate-500">
                      Nenhuma descrição cadastrada.
                    </span>
                  )}
                </InfoBlock>
              </div>
            </section>

            <aside className="flex flex-col gap-4">
              <section className="h-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
                <h3 className="text-lg font-semibold tracking-tight text-slate-900">
                  Status da conta
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Esses indicadores mostram a situação da sua conta e da sua vitrine. O status da
                  conta é definido pela plataforma.
                </p>
                <div className="mt-6 space-y-3">
                  <div
                    className={cn(
                      "flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4",
                      contaInd.row,
                    )}
                  >
                    <div className="flex min-w-0 flex-1 gap-3">
                      <span
                        className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", contaInd.dot)}
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">Conta do vendedor</p>
                        <p className="mt-1 text-sm text-slate-600">{contaInd.description}</p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "inline-flex w-fit shrink-0 self-start rounded-full border px-3 py-1 text-xs font-semibold sm:self-center",
                        contaInd.badgeWrap,
                      )}
                    >
                      {contaInd.badge}
                    </span>
                  </div>

                  <div
                    className={cn(
                      "flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4",
                      vitrineInd.row,
                    )}
                  >
                    <div className="flex min-w-0 flex-1 gap-3">
                      <span
                        className={cn(
                          "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full",
                          vitrineInd.dot,
                        )}
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">Vitrine da loja</p>
                        <p className="mt-1 text-sm text-slate-600">{vitrineInd.description}</p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "inline-flex w-fit shrink-0 self-start rounded-full border px-3 py-1 text-xs font-semibold sm:self-center",
                        vitrineInd.badgeWrap,
                      )}
                    >
                      {vitrineInd.badge}
                    </span>
                  </div>
                </div>
              </section>
            </aside>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
            <h3 className="text-lg font-semibold tracking-tight text-slate-900">Ações rápidas</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Gerencie sua loja e avance para a venda de produtos.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div
                className={cn(
                  "group flex h-full flex-col rounded-xl border border-slate-200 bg-slate-50 p-5 transition-all",
                  !blocked &&
                    "hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50/50 hover:shadow-sm",
                  blocked && "opacity-60",
                )}
              >
                <div className="flex min-w-0 flex-1 gap-3">
                  <div
                    className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 transition-colors group-hover:bg-emerald-200/80"
                    aria-hidden
                  >
                    <Pencil className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-slate-900">
                      Editar informações da loja
                    </h4>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">
                      Atualize nome, slug, descrição e visibilidade da sua loja.
                    </p>
                  </div>
                </div>
                <div className="mt-5 shrink-0">
                  <Button
                    type="button"
                    className="w-full sm:w-auto"
                    onClick={() => setEditing(true)}
                    disabled={blocked}
                  >
                    Editar loja
                  </Button>
                </div>
              </div>

              <div
                className={cn(
                  "group flex h-full flex-col rounded-xl border border-slate-200 bg-slate-50 p-5 transition-all",
                  !blocked &&
                    "hover:-translate-y-0.5 hover:border-sky-200 hover:bg-sky-50/50 hover:shadow-sm",
                  blocked && "opacity-60",
                )}
              >
                <div className="flex min-w-0 flex-1 gap-3">
                  <div
                    className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700 transition-colors group-hover:bg-sky-200/80"
                    aria-hidden
                  >
                    <PackagePlus className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-slate-900">Cadastrar produto</h4>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">
                      Envie fotos, preço e detalhes para publicar itens na sua vitrine. Se a loja
                      estiver inativa, reative-a antes de cadastrar.
                    </p>
                  </div>
                </div>
                <div className="mt-5 shrink-0">
                  {blocked ? (
                    <Button type="button" variant="outline" className="w-full sm:w-auto" disabled>
                      Cadastrar produto
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={handleCadastrarProduto}
                    >
                      Cadastrar produto
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </section>

          <VenderMeusProdutosSection vendedorId={vendedor.id} />
        </>
      ) : (
        <form
          onSubmit={(e) => void handleSave(e)}
          className="product-create-form w-full min-w-0 space-y-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8"
        >
          <header className="space-y-2 border-b border-slate-100 pb-6">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Editar informações da loja
            </h2>
            <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
              Atualize os dados públicos exibidos para compradores. Esses dados aparecem
              publicamente na vitrine.
            </p>
          </header>

          {blocked ? (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
            >
              Conta bloqueada. Entre em contato com o suporte.
            </div>
          ) : null}

          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Dados públicos
              </p>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <div className="min-w-0 space-y-2">
                  <Label htmlFor="edit-nome-loja" className="text-sm font-medium text-slate-900">
                    Nome da loja
                  </Label>
                  <p className="text-xs leading-relaxed text-slate-500">
                    Nome público exibido para compradores.
                  </p>
                  <Input
                    id="edit-nome-loja"
                    value={nomeLoja}
                    onChange={(e) => setNomeLoja(e.target.value)}
                    disabled={saving || blocked}
                    required
                    className={INPUT_CLASS}
                  />
                </div>

                <div className="min-w-0 space-y-2">
                  <Label htmlFor="edit-slug" className="text-sm font-medium text-slate-900">
                    Slug
                  </Label>
                  <p className="text-xs leading-relaxed text-slate-500">
                    Endereço curto da sua loja na plataforma.
                  </p>
                  <Input
                    id="edit-slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    disabled={saving || blocked}
                    required
                    autoComplete="off"
                    className={INPUT_CLASS}
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="edit-descricao" className="text-sm font-medium text-slate-900">
                    Descrição
                  </Label>
                  <p className="text-xs leading-relaxed text-slate-500">
                    Conte brevemente o que sua loja vende.
                  </p>
                  <textarea
                    id="edit-descricao"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    rows={5}
                    disabled={saving || blocked}
                    className={cn(INPUT_CLASS, "min-h-36 h-auto resize-y py-3")}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Visibilidade
              </p>
              <div
                className={cn(
                  "mt-4 rounded-xl border p-4 transition-colors md:p-5",
                  ativo
                    ? "border-emerald-200 bg-emerald-50/70"
                    : "border-amber-200/80 bg-amber-50/50",
                )}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-semibold text-slate-900">Visibilidade da loja</p>
                    <p className="text-sm leading-relaxed text-slate-600">
                      Quando desativada, sua loja fica temporariamente fora da vitrine.
                    </p>
                  </div>
                  <div
                    className={cn(
                      "flex shrink-0 items-center gap-3 rounded-xl border px-4 py-3",
                      ativo
                        ? "border-emerald-200/80 bg-white/80"
                        : "border-amber-200/70 bg-white/80",
                    )}
                  >
                    <Checkbox
                      id="edit-ativo"
                      checked={ativo}
                      onCheckedChange={(c) => setAtivo(c === true)}
                      disabled={saving || blocked}
                    />
                    <Label
                      htmlFor="edit-ativo"
                      className="cursor-pointer text-sm font-medium leading-snug text-slate-900"
                    >
                      Loja ativa
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              disabled={saving}
              onClick={handleCancelEdit}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={saving || blocked}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  Salvando…
                </>
              ) : (
                "Salvar alterações"
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
