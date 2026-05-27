import { useEffect, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { paths } from "@/api/endpoints";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { toMainCategorySlug } from "@/pages/vender/category-product-requirements";
import { useVenderCreateSellerGate } from "@/pages/vender/use-vender-create-seller-gate";
import { VenderProdutoCreateWizard } from "@/pages/vender/vender-produto-create-wizard";

function parseCategoriaIdParam(raw: string | null): number | null {
  if (!raw?.trim()) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

export default function VenderProdutoCreateFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const gate = useVenderCreateSellerGate();
  const { user } = useAuth();

  const categoriaId = parseCategoriaIdParam(searchParams.get("categoria_id"));
  const categoriaSlugRaw = searchParams.get("categoria_slug")?.trim() ?? "";
  const categoriaSlug = toMainCategorySlug(categoriaSlugRaw);
  const hasValidCategory = categoriaId != null && categoriaSlug != null;

  const loginNext = useMemo(() => {
    if (hasValidCategory && categoriaId != null && categoriaSlug) {
      return paths.venderCadastroProdutoFormulario({
        categoriaId,
        categoriaSlug,
      });
    }
    return paths.venderAnunciar();
  }, [categoriaId, categoriaSlug, hasValidCategory]);

  const showWizard =
    gate.bootstrapped && gate.isAuthenticated && gate.canCreate && !gate.loading;

  useEffect(() => {
    if (!gate.bootstrapped) return;
    if (gate.needLogin) {
      navigate(`${paths.login()}?next=${encodeURIComponent(loginNext)}`, { replace: true });
    }
  }, [gate.bootstrapped, gate.needLogin, loginNext, navigate]);

  useEffect(() => {
    if (!showWizard || gate.needLogin) return;
    if (!hasValidCategory) {
      navigate(paths.venderAnunciar(), { replace: true });
    }
  }, [showWizard, gate.needLogin, hasValidCategory, navigate]);

  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden bg-gradient-to-b from-slate-100 via-slate-50 to-emerald-50/25">
      <Header />
      <main className="relative min-w-0 flex-1 pt-[4.5rem]">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(9,188,138,0.12),transparent)]"
          aria-hidden
        />
        <div className="relative mx-auto w-full min-w-0 max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="w-full min-w-0 pb-8 sm:pb-16">
            <div className="w-full min-w-0">
            {gate.awaitingAuthBootstrap ||
            (gate.isAuthenticated && gate.loading && !gate.loadError) ? (
              <div
                role="status"
                aria-busy="true"
                className="rounded-3xl border border-slate-200/80 bg-white/90 p-10 shadow-lg shadow-slate-200/50 backdrop-blur-sm"
              >
                <div className="flex flex-col items-center gap-4 text-center">
                  <Loader2 className="size-10 animate-spin text-[#09bc8a]" aria-hidden />
                  <p className="text-sm font-medium text-slate-600">
                    Carregando cadastro de produto…
                  </p>
                </div>
              </div>
            ) : null}

            {gate.loadError ? (
              <Card className="border-destructive/30 bg-destructive/5">
                <CardHeader>
                  <CardTitle>Não foi possível carregar</CardTitle>
                  <CardDescription>{gate.loadError}</CardDescription>
                </CardHeader>
                <CardFooter className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={() => void gate.load()}>
                    Tentar novamente
                  </Button>
                  <Button type="button" variant="outline" asChild>
                    <Link to={paths.venderAnunciar()}>Voltar</Link>
                  </Button>
                </CardFooter>
              </Card>
            ) : null}

            {gate.blocked && gate.vendedor ? (
              <Card className="border-red-200 bg-red-50/80">
                <CardHeader>
                  <CardTitle className="text-red-950">Conta bloqueada</CardTitle>
                  <CardDescription className="text-red-900">
                    Conta bloqueada. Entre em contato com o suporte.
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button type="button" variant="outline" asChild>
                    <Link to={paths.minhaLoja()}>Minha loja</Link>
                  </Button>
                </CardFooter>
              </Card>
            ) : null}

            {gate.showContaIndisponivel ? (
              <Card>
                <CardHeader>
                  <CardTitle>Cadastro indisponível</CardTitle>
                  <CardDescription>
                    No momento, a situação da sua conta não permite cadastrar produtos.
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button type="button" variant="secondary" asChild>
                    <Link to={paths.venderAnunciar()}>Voltar</Link>
                  </Button>
                </CardFooter>
              </Card>
            ) : null}

            {showWizard && hasValidCategory ? (
              <>
                {gate.pending ? (
                  <div
                    role="status"
                    className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
                  >
                    <p className="font-semibold">Conta em análise</p>
                    <p className="mt-2 leading-relaxed">
                      Você pode preencher o formulário, mas o envio fica desativado até a aprovação.
                    </p>
                  </div>
                ) : null}
                <VenderProdutoCreateWizard
                  disabled={gate.pending}
                  cancelHref={paths.venderAnunciar()}
                  initialCategoriaId={categoriaId}
                  initialCategoriaSlug={categoriaSlug}
                  persistenceScope={{
                    userKey: user?.email,
                    vendedorId: gate.vendedor?.id,
                  }}
                />
              </>
            ) : null}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
