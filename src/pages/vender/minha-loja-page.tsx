import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { vendedoresRoutes, paths } from "@/api/endpoints";
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
import { parseVendedor, type Vendedor } from "@/types/vendedor";

import { VenderPanel } from "./vender-panel";

type Phase = "loading" | "panel";

type LocationState = { aviso?: string } | null;

export default function MinhaLojaPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { bootstrapped, isAuthenticated } = useAuth();
  const [phase, setPhase] = useState<Phase>("loading");
  const [vendedor, setVendedor] = useState<Vendedor | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const avisoInativaNavegacao = useMemo(() => {
    const s = location.state as LocationState;
    return s?.aviso === "inativa";
  }, [location.state]);

  const load = useCallback(async () => {
    setLoadError(null);
    setPhase("loading");
    try {
      const res = await vendedoresRoutes.getMeuVendedor();
      if (res.status === 200) {
        const v = parseVendedor(res.data);
        if (!v) {
          setLoadError("Não foi possível interpretar os dados da loja.");
          setPhase("loading");
          return;
        }
        setVendedor(v);
        setPhase("panel");
        return;
      }
      if (res.status === 404) {
        navigate(paths.venderAnunciar(), { replace: true });
        return;
      }
      setLoadError(`Resposta inesperada (HTTP ${res.status}).`);
      setPhase("loading");
    } catch (e) {
      setLoadError(getAxiosErrorMessage(e));
      setPhase("loading");
    }
  }, [navigate]);

  useEffect(() => {
    if (!bootstrapped || !isAuthenticated) return;
    void load();
  }, [bootstrapped, isAuthenticated, load]);

  const awaitingAuthBootstrap = !bootstrapped;
  const needLogin = bootstrapped && !isAuthenticated;
  const showPanelHeader =
    isAuthenticated && !awaitingAuthBootstrap && phase === "panel" && !loadError;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50/60">
      <Header />
      <main className="mx-auto flex w-full min-w-0 max-w-6xl flex-1 flex-col gap-6 px-4 py-6 pt-24 sm:gap-8 sm:px-6 sm:py-8 sm:pt-28 lg:px-8">
        {showPanelHeader ? (
          <header className="flex flex-col gap-4 border-b border-slate-200/80 pb-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Minha loja
              </h1>
              <p className="max-w-2xl text-base leading-relaxed text-slate-600">
                Painel do vendedor: gerencie os dados públicos da sua loja, acompanhe o status da
                conta e acesse as próximas ações.
              </p>
            </div>
          </header>
        ) : null}

        {awaitingAuthBootstrap && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Carregando…
          </div>
        )}

        {needLogin && (
          <Card>
            <CardHeader>
              <CardTitle>Login necessário</CardTitle>
              <CardDescription>
                Para acessar sua loja, entre na sua conta.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button type="button" asChild>
                <Link
                  to={`${paths.login()}?next=${encodeURIComponent(paths.minhaLoja())}`}
                >
                  Entrar
                </Link>
              </Button>
            </CardFooter>
          </Card>
        )}

        {!awaitingAuthBootstrap && isAuthenticated && phase === "loading" && !loadError && (
          <div
            className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground"
            aria-busy="true"
            aria-label="Carregando"
          >
            <Loader2 className="size-10 animate-spin text-[#09bc8a]" aria-hidden />
            <p className="text-sm">Carregando…</p>
          </div>
        )}

        {!awaitingAuthBootstrap && isAuthenticated && loadError && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader>
              <CardTitle>Não foi possível carregar</CardTitle>
              <CardDescription>{loadError}</CardDescription>
            </CardHeader>
            <CardFooter className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => void load()}>
                Tentar novamente
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link
                  to={`${paths.login()}?next=${encodeURIComponent(paths.minhaLoja())}`}
                >
                  Ir para o login
                </Link>
              </Button>
            </CardFooter>
          </Card>
        )}

        {!awaitingAuthBootstrap && isAuthenticated && phase === "panel" && vendedor && !loadError && (
          <div className="flex flex-col gap-6">
            {avisoInativaNavegacao || !vendedor.ativo ? (
              <div
                role="status"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-relaxed text-slate-800 shadow-sm sm:px-5"
              >
                Sua loja está inativa. Para voltar a vender, abra &quot;Editar
                informações&quot; e marque &quot;Loja ativa&quot;, depois salve.
              </div>
            ) : null}

            <VenderPanel vendedor={vendedor} onUpdated={setVendedor} />
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
