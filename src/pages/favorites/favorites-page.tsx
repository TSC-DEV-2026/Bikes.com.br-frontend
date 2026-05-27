import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Loader2 } from "lucide-react";

import {
  listFavoritos,
  removeFavorito,
} from "@/api/endpoints/favoritos.routes";
import { getProdutoById } from "@/api/endpoints/produtos.routes";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { useFavoritesCount } from "@/contexts/favorites-count-context";
import type { ProdutoId, ProdutoListaView } from "@/types/produto";
import { normalizeProdutoDetalhe } from "@/types/produto";
import {
  extractProdutoIdFromFavoritoEntry,
  unwrapFavoritosListPayload,
} from "@/types/favorito";

function CardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-[340px] animate-pulse rounded-xl border bg-muted/40"
          aria-hidden
        />
      ))}
    </div>
  );
}

function friendlyListError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    if (status === 401 || status === 403)
      return "Sua sessão expirou ou você não tem permissão. Faça login novamente.";
    if (status === 404) return "Lista de favoritos não encontrada.";
    if (status && status >= 500)
      return "Servidor temporariamente indisponível. Tente de novo mais tarde.";
    if (!err.response && err.code === "ERR_NETWORK")
      return "Não foi possível conectar ao servidor. Verifique sua rede.";
  }
  return "Não foi possível carregar seus favoritos.";
}

function getUniqueProdutoIdsFromFavoritos(data: unknown): ProdutoId[] {
  const out: ProdutoId[] = [];
  const seen = new Set<string>();

  for (const entry of unwrapFavoritosListPayload(data)) {
    const id = extractProdutoIdFromFavoritoEntry(entry);
    if (id == null) continue;

    const key = String(id);
    if (seen.has(key)) continue;

    seen.add(key);
    out.push(id);
  }

  return out;
}

function detalheToListaView(
  produtoId: ProdutoId,
  data: unknown,
): ProdutoListaView | null {
  const detalhe = normalizeProdutoDetalhe(String(produtoId), data);
  if (!detalhe) return null;

  return {
    id: detalhe.id,
    titulo: detalhe.titulo,
    precoTexto: detalhe.precoTexto,
    precoOriginalTexto: null,
    imagemUrl: detalhe.imagens[0] ?? null,
    statusOuCondicao: detalhe.condicao ?? detalhe.status,
  };
}

export default function FavoritesPage() {
  const { bootstrapped, isAuthenticated } = useAuth();
  const { refreshFavoriteCount, acknowledgeFavoritesBadge } =
    useFavoritesCount();
  const [items, setItems] = useState<ProdutoListaView[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await listFavoritos();
      if (!res.ok) {
        setItems([]);
        setErrorMsg("Não foi possível carregar seus favoritos.");
        return;
      }

      const produtoIds = getUniqueProdutoIdsFromFavoritos(res.data);
      // Zera o badge: tudo que está aqui é considerado "visto".
      acknowledgeFavoritesBadge(produtoIds.map((id) => String(id)));

      if (produtoIds.length === 0) {
        setItems([]);
        return;
      }

      const produtos = await Promise.allSettled(
        produtoIds.map(async (produtoId) => {
          const produtoRes = await getProdutoById(produtoId);
          return detalheToListaView(produtoId, produtoRes.data);
        }),
      );

      const loadedItems = produtos
        .filter(
          (result): result is PromiseFulfilledResult<ProdutoListaView | null> =>
            result.status === "fulfilled",
        )
        .map((result) => result.value)
        .filter((produto): produto is ProdutoListaView => produto != null);

      setItems(loadedItems);
      if (loadedItems.length === 0) {
        setErrorMsg(
          "Seus favoritos foram encontrados, mas não foi possível carregar os produtos.",
        );
      }
    } catch (e) {
      setItems([]);
      setErrorMsg(friendlyListError(e));
    } finally {
      setLoading(false);
    }
  }, [acknowledgeFavoritesBadge]);

  useEffect(() => {
    if (!bootstrapped || !isAuthenticated) return;
    void load();
  }, [bootstrapped, isAuthenticated, load]);

  const handleRemove = async (id: ProdutoListaView["id"]) => {
    const key = String(id);
    setRemovingId(key);
    try {
      await removeFavorito(id);
      setItems((prev) => prev.filter((p) => String(p.id) !== key));
      void refreshFavoriteCount();
    } catch {
      setErrorMsg("Não foi possível remover este favorito. Tente novamente.");
    } finally {
      setRemovingId(null);
    }
  };

  const showContent = bootstrapped && isAuthenticated;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-32">
        <div>
          <BackButton className="-ml-2 mb-4 gap-2 px-2 " />
          <h1 className="text-3xl font-extrabold tracking-tight">Favoritos</h1>
          <p className="mt-2 text-muted-foreground">
            Produtos que você salvou para ver depois.
          </p>
        </div>

        {!showContent && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Carregando…
          </div>
        )}

        {showContent && loading && <CardsSkeleton />}

        {showContent && !loading && errorMsg && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader>
              <CardTitle>Não foi possível carregar</CardTitle>
              <CardDescription>{errorMsg}</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void load()}
              >
                Tentar novamente
              </Button>
            </CardFooter>
          </Card>
        )}

        {showContent && !loading && !errorMsg && items.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => (
              <Card
                key={String(p.id)}
                className="flex h-full flex-col overflow-hidden pt-0 shadow-sm"
              >
                <Link
                  to={`/produtos/${encodeURIComponent(String(p.id))}`}
                  className="relative block aspect-[4/3] w-full bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {p.imagemUrl ? (
                    <img
                      src={p.imagemUrl}
                      alt=""
                      className="absolute inset-0 h-full w-full object-contain p-3 transition-transform hover:scale-[1.02]"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                      Sem imagem
                    </div>
                  )}
                </Link>
                <CardHeader className="gap-2 pb-2">
                  <CardTitle className="line-clamp-2 text-base leading-snug">
                    <Link
                      to={`/produtos/${encodeURIComponent(String(p.id))}`}
                      className="outline-none hover:text-[#09bc8a] focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {p.titulo}
                    </Link>
                  </CardTitle>
                  {p.statusOuCondicao && (
                    <CardDescription>
                      <span className="inline-flex rounded-full border bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                        {p.statusOuCondicao}
                      </span>
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pb-4 pt-0">
                  <p className="text-lg font-semibold tracking-tight">
                    {p.precoTexto ?? "Preço sob consulta"}
                  </p>
                </CardContent>
                <CardFooter className="mt-auto border-t pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-red-600 bg-red-600 text-white hover:border-red-400 hover:bg-red-400 hover:text-white"
                    disabled={removingId === String(p.id)}
                    onClick={() => void handleRemove(p.id)}
                  >
                    {removingId === String(p.id) ? (
                      <>
                        <Loader2
                          className="mr-2 size-4 animate-spin"
                          aria-hidden
                        />
                        Removendo…
                      </>
                    ) : (
                      "Remover dos favoritos"
                    )}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {showContent && !loading && !errorMsg && items.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Nenhum favorito ainda</CardTitle>
              <CardDescription>
                Explore o catálogo e toque em favoritar no produto para salvar
                aqui.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild>
                <Link to="/home">Ver produtos</Link>
              </Button>
            </CardFooter>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
}
