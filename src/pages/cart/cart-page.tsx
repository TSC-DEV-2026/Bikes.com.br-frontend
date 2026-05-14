import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Minus, Plus, Trash2 } from "lucide-react";

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
import { useCart } from "@/contexts/cart-context";
import type { ProdutoId, ProdutoListaView } from "@/types/produto";
import { normalizeProdutoDetalhe } from "@/types/produto";
import type { CarrinhoItemCardView } from "@/types/carrinho";
import {
  cartLineStableKey,
  extractCartLineExtras,
  extractCartLineItemId,
  extractEmbeddedProdutoCardHints,
  extractProdutoIdFromCartEntry,
  unwrapCartItemsFromPayload,
} from "@/types/carrinho";

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
    imagemUrl: detalhe.imagens[0] ?? null,
    statusOuCondicao: detalhe.condicao ?? detalhe.status,
  };
}

function mergeListaExtrasHints(
  view: ProdutoListaView,
  extras: ReturnType<typeof extractCartLineExtras>,
  hints: ReturnType<typeof extractEmbeddedProdutoCardHints>,
  key: string,
  lineItemId: string | number | null,
): CarrinhoItemCardView {
  return {
    key,
    lineItemId,
    produtoId: view.id,
    titulo: view.titulo || hints.titulo || `Produto #${view.id}`,
    precoTexto: view.precoTexto ?? hints.precoTexto,
    imagemUrl: view.imagemUrl ?? hints.imagemUrl,
    statusOuCondicao: view.statusOuCondicao ?? hints.statusOuCondicao,
    quantidade: extras.quantidade,
    subtotalTexto: extras.subtotalTexto,
    vendedorTexto: extras.vendedorTexto,
  };
}

function cardFromHintsPid(
  pid: ProdutoId,
  extras: ReturnType<typeof extractCartLineExtras>,
  hints: ReturnType<typeof extractEmbeddedProdutoCardHints>,
  key: string,
  lineItemId: string | number | null,
): CarrinhoItemCardView | null {
  if (!hints.titulo && !hints.precoTexto && !hints.imagemUrl) return null;
  return {
    key,
    lineItemId,
    produtoId: pid,
    titulo: hints.titulo ?? `Produto #${pid}`,
    precoTexto: hints.precoTexto,
    imagemUrl: hints.imagemUrl,
    statusOuCondicao: hints.statusOuCondicao,
    quantidade: extras.quantidade,
    subtotalTexto: extras.subtotalTexto,
    vendedorTexto: extras.vendedorTexto,
  };
}

function sortedLineKeysSignature(raw: unknown[]): string {
  return raw
    .map((row, index) => cartLineStableKey(row, index))
    .slice()
    .sort()
    .join("\0");
}

function patchCardsFromCartRows(
  prev: CarrinhoItemCardView[],
  raw: unknown[],
): CarrinhoItemCardView[] {
  const byKey = new Map(
    raw.map((row, index) => [cartLineStableKey(row, index), row]),
  );
  return prev.map((item) => {
    const row = byKey.get(item.key);
    if (!row) return item;
    const extras = extractCartLineExtras(row);
    const lineItemId = extractCartLineItemId(row);
    return {
      ...item,
      lineItemId,
      quantidade:
        extras.quantidade !== null ? extras.quantidade : item.quantidade,
      subtotalTexto: extras.subtotalTexto ?? item.subtotalTexto,
      vendedorTexto: extras.vendedorTexto ?? item.vendedorTexto,
    };
  });
}

function samePatchedCard(a: CarrinhoItemCardView, b: CarrinhoItemCardView): boolean {
  return (
    a.quantidade === b.quantidade &&
    a.subtotalTexto === b.subtotalTexto &&
    a.vendedorTexto === b.vendedorTexto &&
    a.lineItemId === b.lineItemId
  );
}

export default function CartPage() {
  const { bootstrapped, isAuthenticated } = useAuth();
  const { cart, cartLoading, cartError, refreshCart, updateItemQuantity, removeItem, lineItemPending } =
    useCart();
  const [items, setItems] = useState<CarrinhoItemCardView[]>([]);
  const [enriching, setEnriching] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [cartActionError, setCartActionError] = useState<string | null>(null);
  const itemsRef = useRef<CarrinhoItemCardView[]>([]);
  itemsRef.current = items;

  const showContent = bootstrapped && isAuthenticated;
  const blockingError = cartError ?? parseError;
  const showSkeleton = showContent && (cartLoading || enriching) && !cartError;

  const rawLineCount = useMemo(
    () => unwrapCartItemsFromPayload(cart).length,
    [cart],
  );

  useEffect(() => {
    setParseError(null);
    if (!bootstrapped || !isAuthenticated) {
      setEnriching(false);
      return;
    }
    if (cartLoading || cartError) {
      setItems([]);
      setEnriching(false);
      return;
    }

    const raw = unwrapCartItemsFromPayload(cart);
    if (raw.length === 0) {
      setItems([]);
      setEnriching(false);
      return;
    }

    const prevItems = itemsRef.current;
    const rawKeysSig = sortedLineKeysSignature(raw);
    const prevKeysSig =
      prevItems.length > 0
        ? prevItems
            .map((it) => it.key)
            .slice()
            .sort()
            .join("\0")
        : "";

    if (
      prevItems.length > 0 &&
      prevItems.length === raw.length &&
      rawKeysSig === prevKeysSig
    ) {
      setItems((prev) => {
        const next = patchCardsFromCartRows(prev, raw);
        const unchanged =
          prev.length === next.length &&
          prev.every((p, i) => samePatchedCard(p, next[i]!));
        return unchanged ? prev : next;
      });
      setEnriching(false);
      return () => {};
    }

    let cancelled = false;
    setEnriching(true);

    void (async () => {
      try {
        const built = await Promise.all(
          raw.map(async (row, index) => {
            const pid = extractProdutoIdFromCartEntry(row);
            const extras = extractCartLineExtras(row);
            const hints = extractEmbeddedProdutoCardHints(row);
            const key = cartLineStableKey(row, index);
            const lineItemId = extractCartLineItemId(row);
            if (pid == null) {
              return null;
            }
            try {
              const produtoRes = await getProdutoById(pid);
              const view = detalheToListaView(pid, produtoRes.data);
              if (view) {
                return mergeListaExtrasHints(view, extras, hints, key, lineItemId);
              }
            } catch {
              /* usar hints se existirem */
            }
            return cardFromHintsPid(pid, extras, hints, key, lineItemId);
          }),
        );
        if (cancelled) return;
        const filtered = built.filter(
          (x): x is CarrinhoItemCardView => x != null,
        );
        setItems(filtered);
        if (filtered.length === 0 && raw.length > 0) {
          setParseError(
            "Os itens do carrinho foram encontrados, mas não foi possível carregar os produtos.",
          );
        }
      } catch {
        if (!cancelled) {
          setItems([]);
          setParseError("Não foi possível carregar os produtos do carrinho.");
        }
      } finally {
        if (!cancelled) setEnriching(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bootstrapped, isAuthenticated, cart, cartLoading, cartError]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-32">
        <div>
          <BackButton className="-ml-2 mb-4 gap-2 px-2 " />
          <h1 className="text-3xl font-extrabold tracking-tight">Carrinho</h1>
          <p className="mt-2 text-muted-foreground">
            Itens que você pretende comprar. O checkout estará disponível em
            breve.
          </p>
        </div>

        {!showContent && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Carregando…
          </div>
        )}

        {showSkeleton && <CardsSkeleton />}

        {showContent && !showSkeleton && blockingError && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader>
              <CardTitle>Não foi possível carregar</CardTitle>
              <CardDescription>{blockingError}</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void refreshCart()}
              >
                Tentar novamente
              </Button>
            </CardFooter>
          </Card>
        )}

        {showContent &&
          !showSkeleton &&
          !blockingError &&
          items.length > 0 && (
            <>
              {cartActionError ? (
                <p className="text-sm text-destructive" role="alert">
                  {cartActionError}
                </p>
              ) : null}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((p) => {
                  const lineId = p.lineItemId;
                  const qty = p.quantidade ?? 1;
                  const lineBusy = lineId != null && lineItemPending(lineId);
                  const canMutate = lineId != null && !lineBusy;

                  return (
                  <Card
                    key={p.key}
                    className="flex w-full max-sm:mx-auto max-sm:max-w-sm flex-col overflow-hidden pt-0 shadow-sm sm:max-w-none"
                  >
                    <Link
                      to={`/produtos/${encodeURIComponent(String(p.produtoId))}`}
                      className="flex h-40 w-full shrink-0 items-center justify-center overflow-hidden rounded-t-xl bg-muted p-2 outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-56 sm:p-4 md:h-48 lg:h-52"
                    >
                      {p.imagemUrl ? (
                        <img
                          src={p.imagemUrl}
                          alt=""
                          className="max-h-32 w-auto max-w-[90%] object-contain transition-transform hover:scale-[1.02] sm:max-h-48 sm:max-w-[85%] md:max-h-40 lg:max-h-44"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full min-h-0 w-full flex-1 items-center justify-center text-sm text-muted-foreground">
                          Sem imagem
                        </div>
                      )}
                    </Link>
                    <CardHeader className="gap-2 pb-2">
                      <CardTitle className="line-clamp-2 text-base leading-snug">
                        <Link
                          to={`/produtos/${encodeURIComponent(String(p.produtoId))}`}
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
                    <CardContent className="flex flex-col gap-3 pb-4 pt-0">
                      <p className="text-lg font-semibold tracking-tight">
                        {p.precoTexto ?? "Preço sob consulta"}
                      </p>
                      <div
                        className="flex flex-wrap items-center gap-2"
                        aria-busy={lineBusy}
                      >
                        <span className="text-sm text-muted-foreground">
                          Quantidade
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-9 shrink-0"
                            disabled={!canMutate || qty <= 1}
                            aria-label="Diminuir quantidade"
                            onClick={() => {
                              if (lineId == null || qty <= 1) return;
                              setCartActionError(null);
                              void updateItemQuantity(lineId, qty - 1).then(
                                (r) => {
                                  if (!r.ok) setCartActionError(r.message);
                                },
                              );
                            }}
                          >
                            <Minus className="size-4" aria-hidden />
                          </Button>
                          <span className="min-w-[2rem] text-center text-sm font-semibold tabular-nums">
                            {qty}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-9 shrink-0"
                            disabled={!canMutate}
                            aria-label="Aumentar quantidade"
                            onClick={() => {
                              if (lineId == null) return;
                              setCartActionError(null);
                              void updateItemQuantity(lineId, qty + 1).then(
                                (r) => {
                                  if (!r.ok) setCartActionError(r.message);
                                },
                              );
                            }}
                          >
                            <Plus className="size-4" aria-hidden />
                          </Button>
                          {lineBusy ? (
                            <Loader2
                              className="size-4 shrink-0 animate-spin text-muted-foreground"
                              aria-hidden
                            />
                          ) : null}
                        </div>
                      </div>
                      {lineId == null ? (
                        <p className="text-xs text-amber-800 dark:text-amber-200">
                          Não foi possível identificar esta linha no servidor;
                          alteração e remoção indisponíveis.
                        </p>
                      ) : null}
                      {p.subtotalTexto && (
                        <p className="text-sm text-muted-foreground">
                          Subtotal:{" "}
                          <span className="font-medium text-foreground">
                            {p.subtotalTexto}
                          </span>
                        </p>
                      )}
                      {p.vendedorTexto && (
                        <p className="text-sm text-muted-foreground">
                          Vendedor:{" "}
                          <span className="font-medium text-foreground">
                            {p.vendedorTexto}
                          </span>
                        </p>
                      )}
                    </CardContent>
                    <CardFooter className="mt-auto flex flex-col gap-2 border-t pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={lineId == null || !canMutate}
                        onClick={() => {
                          if (lineId == null) return;
                          setCartActionError(null);
                          void removeItem(lineId).then((r) => {
                            if (!r.ok) setCartActionError(r.message);
                          });
                        }}
                      >
                        {lineBusy ? (
                          <Loader2
                            className="size-4 animate-spin"
                            aria-hidden
                          />
                        ) : (
                          <Trash2 className="size-4" aria-hidden />
                        )}
                        Remover do carrinho
                      </Button>
                      <Button variant="secondary" className="w-full" asChild>
                        <Link
                          to={`/produtos/${encodeURIComponent(String(p.produtoId))}`}
                        >
                          Ver produto
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                  );
                })}
              </div>

              <Card>
                <CardFooter className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    O pagamento e a finalização do pedido chegarão em uma próxima
                    etapa.
                  </p>
                  <Button type="button" disabled className="w-full sm:w-auto">
                    Finalizar compra (em breve)
                  </Button>
                </CardFooter>
              </Card>
            </>
          )}

        {showContent &&
          !showSkeleton &&
          !blockingError &&
          items.length === 0 &&
          rawLineCount === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Seu carrinho está vazio</CardTitle>
                <CardDescription>
                  Explore o catálogo e adicione produtos ao carrinho a partir da
                  página do anúncio.
                </CardDescription>
              </CardHeader>
              <CardFooter className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link to="/home">Continuar comprando</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/produtos">Ver produtos</Link>
                </Button>
              </CardFooter>
            </Card>
          )}
      </main>
      <Footer />
    </div>
  );
}
