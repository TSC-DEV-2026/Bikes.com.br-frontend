import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { vendedoresRoutes, paths } from "@/api/endpoints";
import { getProdutoById } from "@/api/endpoints/produtos.routes";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { getAxiosErrorMessage } from "@/lib/api-error";
import {
  extractVendedorIdFromProdutoPayload,
  normalizeProdutoDetalhe,
  type ProdutoDetalheView,
  type ProdutoImagemView,
} from "@/types/produto";
import { parseVendedor, type Vendedor } from "@/types/vendedor";

import { VenderProdutoEditWizard } from "./vender-produto-edit-wizard";

type LoadPhase =
  | { status: "auth" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      vendedor: Vendedor;
      produto: ProdutoDetalheView;
      rawPayload: unknown;
    };

export default function VenderProdutoEditPage() {
  const { id: rawId } = useParams<{ id: string }>();
  const produtoId = rawId?.trim() ?? "";
  const navigate = useNavigate();
  const { bootstrapped, isAuthenticated } = useAuth();
  const [phase, setPhase] = useState<LoadPhase>({ status: "auth" });

  const load = useCallback(async () => {
    if (!produtoId) {
      setPhase({ status: "error", message: "Identificador do produto inválido." });
      return;
    }

    setPhase({ status: "loading" });
    try {
      const vRes = await vendedoresRoutes.getMeuVendedor();
      if (vRes.status === 404) {
        navigate(paths.minhaLoja(), { replace: true });
        return;
      }
      if (vRes.status !== 200) {
        setPhase({
          status: "error",
          message: `Não foi possível confirmar sua loja (HTTP ${vRes.status}).`,
        });
        return;
      }
      const vendedor = parseVendedor(vRes.data);
      if (!vendedor) {
        setPhase({ status: "error", message: "Não foi possível interpretar os dados da loja." });
        return;
      }

      const pRes = await getProdutoById(produtoId);
      const produto = normalizeProdutoDetalhe(produtoId, pRes.data);
      if (!produto) {
        setPhase({
          status: "error",
          message: "Os dados deste produto chegaram em um formato não reconhecido.",
        });
        return;
      }

      const ownerId = extractVendedorIdFromProdutoPayload(pRes.data);
      if (ownerId == null || ownerId !== vendedor.id) {
        navigate(`/produtos/${encodeURIComponent(produtoId)}`, { replace: true });
        return;
      }

      setPhase({
        status: "ready",
        vendedor,
        produto,
        rawPayload: pRes.data,
      });
    } catch (e) {
      setPhase({
        status: "error",
        message: getAxiosErrorMessage(e, "Não foi possível carregar o produto para edição."),
      });
    }
  }, [navigate, produtoId]);

  const patchProdutoImagens = useCallback((imagensGaleria: ProdutoImagemView[]) => {
    setPhase((prev) =>
      prev.status === "ready"
        ? {
            ...prev,
            produto: {
              ...prev.produto,
              imagensGaleria,
              imagens: imagensGaleria.map((im) => im.url),
            },
          }
        : prev,
    );
  }, []);

  const refreshProdutoImagens = useCallback(async () => {
    if (!produtoId) return;
    try {
      const pRes = await getProdutoById(produtoId);
      const produto = normalizeProdutoDetalhe(produtoId, pRes.data);
      if (!produto) return;
      setPhase((prev) =>
        prev.status === "ready"
          ? { ...prev, produto, rawPayload: pRes.data }
          : prev,
      );
    } catch {
      // Mantém galeria atual; toast de erro já exibido no painel de upload.
    }
  }, [produtoId]);

  useEffect(() => {
    if (!bootstrapped) return;
    if (!isAuthenticated) {
      const next = `/login?next=${encodeURIComponent(
        paths.minhaLojaProdutoEditar(produtoId || "0"),
      )}`;
      navigate(next, { replace: true });
      return;
    }
    if (!produtoId) {
      setPhase({ status: "error", message: "Identificador do produto inválido." });
      return;
    }
    void load();
  }, [bootstrapped, isAuthenticated, load, navigate, produtoId]);

  const blocked = phase.status === "ready" && phase.vendedor.status.toLowerCase() === "blocked";
  const previewHref = produtoId ? paths.minhaLojaProduto(produtoId) : paths.minhaLoja();

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-100 via-slate-50 to-emerald-50/25">
      <Header />
      <main className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 pb-12 pt-24 sm:px-6 sm:pt-28 lg:px-8">
        {!bootstrapped || phase.status === "auth" || phase.status === "loading" ? (
          <div
            role="status"
            aria-busy="true"
            className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10"
          >
            <div className="flex flex-col items-center justify-center gap-4 py-10 text-center sm:py-14">
              <Loader2 className="size-10 shrink-0 animate-spin text-[#09bc8a]" aria-hidden />
              <p className="text-sm font-medium text-slate-600 sm:text-base">
                Carregando edição do produto…
              </p>
            </div>
          </div>
        ) : null}

        {phase.status === "error" ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader>
              <CardTitle>Não foi possível carregar</CardTitle>
              <CardDescription>{phase.message}</CardDescription>
            </CardHeader>
            <CardFooter className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => void load()}>
                Tentar novamente
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link to={paths.minhaLoja()}>Minha loja</Link>
              </Button>
            </CardFooter>
          </Card>
        ) : null}

        {blocked ? (
          <Card className="border-red-200 bg-red-50/80">
            <CardHeader>
              <CardTitle className="text-red-950">Conta bloqueada</CardTitle>
              <CardDescription className="text-red-900">
                Sua conta está bloqueada. A edição de produtos não está disponível.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button type="button" variant="outline" asChild>
                <Link to={previewHref}>Voltar à visualização</Link>
              </Button>
            </CardFooter>
          </Card>
        ) : null}

        {phase.status === "ready" && !blocked ? (
          <VenderProdutoEditWizard
            produtoId={produtoId}
            produto={phase.produto}
            rawPayload={phase.rawPayload}
            previewHref={previewHref}
            onImagensChange={patchProdutoImagens}
            onProdutoRefresh={refreshProdutoImagens}
          />
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
