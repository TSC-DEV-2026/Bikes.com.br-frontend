import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { vendedoresRoutes, paths } from "@/api/endpoints";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { BackButton } from "@/components/back-button";
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
import { parseVendedor } from "@/types/vendedor";

export default function VenderEntryPage() {
  const navigate = useNavigate();
  const { bootstrapped, isAuthenticated } = useAuth();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [routing, setRouting] = useState(true);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (!bootstrapped || !isAuthenticated) return;

    let cancelled = false;
    setLoadError(null);
    setBlocked(false);
    setRouting(true);

    void (async () => {
      try {
        const res = await vendedoresRoutes.getMeuVendedor();
        if (cancelled) return;

        if (res.status === 404) {
          navigate(paths.venderAnunciar(), { replace: true });
          return;
        }

        if (res.status !== 200) {
          setLoadError(`Resposta inesperada (HTTP ${res.status}).`);
          setRouting(false);
          return;
        }

        const v = parseVendedor(res.data);
        if (!v) {
          setLoadError("Não foi possível interpretar os dados da loja.");
          setRouting(false);
          return;
        }

        if (v.status === "blocked") {
          setBlocked(true);
          setRouting(false);
          return;
        }

        if (!v.ativo) {
          navigate(paths.minhaLoja(), {
            replace: true,
            state: { aviso: "inativa" },
          });
          return;
        }

        navigate(paths.venderAnunciar(), { replace: true });
      } catch (e) {
        if (!cancelled) {
          setLoadError(getAxiosErrorMessage(e));
          setRouting(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bootstrapped, isAuthenticated, navigate, retryToken]);

  const awaitingAuthBootstrap = !bootstrapped;
  const needLogin = bootstrapped && !isAuthenticated;
  const validatingSeller =
    bootstrapped && isAuthenticated && routing && !loadError && !blocked;

  /** Evita flash da tela "Vender produtos" antes do redirect ou durante bootstrap da sessão. */
  if (awaitingAuthBootstrap || validatingSeller) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main
          className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-3 px-4 py-32"
          aria-busy="true"
          aria-label={
            awaitingAuthBootstrap ? "Carregando sessão" : "Verificando conta de vendedor"
          }
        >
          <Loader2 className="size-10 animate-spin text-[#09bc8a]" aria-hidden />
          <p className="text-sm text-muted-foreground">
            {awaitingAuthBootstrap ? "Carregando…" : "Verificando sua conta de vendedor…"}
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-32">
        <div>
          <BackButton className="-ml-2 mb-4 gap-2 px-2" />
          <h1 className="text-3xl font-extrabold tracking-tight">Vender produtos</h1>
          <p className="mt-2 text-muted-foreground">
            Verificamos sua conta de vendedor para seguir com o cadastro de produtos.
          </p>
        </div>

        {needLogin && (
          <Card>
            <CardHeader>
              <CardTitle>Login necessário</CardTitle>
              <CardDescription>
                Para vender na plataforma, entre na sua conta.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button type="button" asChild>
                <Link
                  to={`${paths.login()}?next=${encodeURIComponent(paths.vender())}`}
                >
                  Entrar
                </Link>
              </Button>
            </CardFooter>
          </Card>
        )}

        {isAuthenticated && loadError && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader>
              <CardTitle>Não foi possível continuar</CardTitle>
              <CardDescription>{loadError}</CardDescription>
            </CardHeader>
            <CardFooter className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setRetryToken((t) => t + 1)}
              >
                Tentar novamente
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link to={paths.minhaLoja()}>Minha loja</Link>
              </Button>
            </CardFooter>
          </Card>
        )}

        {isAuthenticated && blocked && (
          <Card className="border-red-200 bg-red-50/80">
            <CardHeader>
              <CardTitle className="text-red-950">Conta bloqueada</CardTitle>
              <CardDescription className="text-red-900">
                Conta bloqueada. Entre em contato com o suporte.
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" asChild>
                <Link to={paths.minhaLoja()}>Ir para Minha loja</Link>
              </Button>
              <Button type="button" variant="secondary" asChild>
                <Link to={paths.home()}>Página inicial</Link>
              </Button>
            </CardFooter>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
}
