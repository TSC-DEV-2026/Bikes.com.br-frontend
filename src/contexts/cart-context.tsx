import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axios from "axios";
import {
  deleteCarrinhoItemById,
  getCarrinho,
  postCarrinhoItem,
  putCarrinhoItemById,
} from "@/api/endpoints/carrinho.routes";
import { useAuth } from "@/contexts/auth-context";
import type { ProdutoId } from "@/types/produto";
import { totalUnidadesNoCarrinho } from "@/types/carrinho";

function produtoIdToCartNumber(id: ProdutoId): number | null {
  if (typeof id === "number" && Number.isFinite(id)) return id;
  if (typeof id === "string" && id.trim()) {
    const n = Number(id.trim());
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function messageForCartAxiosError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    if (status === 401 || status === 403) {
      return "Faça login para usar o carrinho ou sua sessão expirou.";
    }
    if (status === 404) return "Carrinho não encontrado. Tente novamente.";
    if (status && status >= 500)
      return "Servidor temporariamente indisponível. Tente de novo mais tarde.";
    if (!err.response && err.code === "ERR_NETWORK")
      return "Não foi possível conectar ao servidor. Verifique sua rede.";
  }
  return "Não foi possível atualizar o carrinho. Tente de novo.";
}

export type AddItemResult =
  | { ok: true }
  | { ok: false; message: string };

export type CartMutationResult =
  | { ok: true }
  | { ok: false; message: string };

function lineActionKey(itemId: string | number): string {
  return String(itemId);
}

type CartContextValue = {
  /** Soma de quantidades das linhas do carrinho (último GET bem-sucedido). */
  totalQuantity: number;
  /** Último payload bruto do GET /carrinho (útil para evoluir a UI depois). */
  cart: unknown | null;
  /** Falha no último GET completo (não usado em refresh silencioso após POST). */
  cartError: string | null;
  cartLoading: boolean;
  addPending: boolean;
  /** PUT ou DELETE em andamento para a linha `itemId`. */
  lineItemPending: (itemId: string | number) => boolean;
  refreshCart: () => Promise<void>;
  addItemToCart: (produtoId: ProdutoId, quantidade?: number) => Promise<AddItemResult>;
  updateItemQuantity: (
    itemId: string | number,
    quantidade: number,
  ) => Promise<CartMutationResult>;
  removeItem: (itemId: string | number) => Promise<CartMutationResult>;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, bootstrapped } = useAuth();
  const [cart, setCart] = useState<unknown | null>(null);
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [cartError, setCartError] = useState<string | null>(null);
  const [cartLoading, setCartLoading] = useState(false);
  const [addPending, setAddPending] = useState(false);
  const [lineActionPending, setLineActionPending] = useState<Record<string, boolean>>({});
  const linePendingKeysRef = useRef<Set<string>>(new Set());

  const loadCart = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!isAuthenticated) {
        setCart(null);
        setTotalQuantity(0);
        setCartError(null);
        return;
      }
      const silent = opts?.silent === true;
      if (!silent) setCartLoading(true);
      try {
        const res = await getCarrinho();
        setCart(res.data);
        setTotalQuantity(totalUnidadesNoCarrinho(res.data));
        setCartError(null);
      } catch (e) {
        if (!silent) {
          setCart(null);
          setTotalQuantity(0);
          setCartError(messageForCartAxiosError(e));
        }
      } finally {
        if (!silent) setCartLoading(false);
      }
    },
    [isAuthenticated]
  );

  const refreshCart = useCallback(async () => {
    await loadCart({ silent: false });
  }, [loadCart]);

  useEffect(() => {
    if (!bootstrapped) return;
    if (!isAuthenticated) {
      setCart(null);
      setTotalQuantity(0);
      setCartError(null);
      return;
    }
    void loadCart({ silent: false });
  }, [bootstrapped, isAuthenticated, loadCart]);

  const addItemToCart = useCallback(
    async (produtoId: ProdutoId, quantidade = 1): Promise<AddItemResult> => {
      const pid = produtoIdToCartNumber(produtoId);
      if (pid == null) {
        return { ok: false, message: "Identificador do produto inválido para o carrinho." };
      }
      if (!isAuthenticated) {
        return { ok: false, message: "Faça login para adicionar produtos ao carrinho." };
      }
      const qty = Number.isFinite(quantidade) && quantidade > 0 ? Math.floor(quantidade) : 1;

      setAddPending(true);
      try {
        await postCarrinhoItem({ produto_id: pid, quantidade: qty });
        try {
          await loadCart({ silent: true });
        } catch {
          setTotalQuantity((q) => q + qty);
        }
        return { ok: true };
      } catch (e) {
        return { ok: false, message: messageForCartAxiosError(e) };
      } finally {
        setAddPending(false);
      }
    },
    [isAuthenticated, loadCart]
  );

  const lineItemPending = useCallback(
    (itemId: string | number) => lineActionPending[lineActionKey(itemId)] === true,
    [lineActionPending],
  );

  const updateItemQuantity = useCallback(
    async (itemId: string | number, quantidade: number): Promise<CartMutationResult> => {
      if (!isAuthenticated) {
        return { ok: false, message: "Faça login para alterar o carrinho." };
      }
      const key = lineActionKey(itemId);
      if (linePendingKeysRef.current.has(key)) {
        return { ok: false, message: "Aguarde a operação anterior." };
      }
      linePendingKeysRef.current.add(key);
      setLineActionPending((m) => ({ ...m, [key]: true }));
      const q = Math.floor(quantidade);
      if (!Number.isFinite(q) || q < 1) {
        linePendingKeysRef.current.delete(key);
        setLineActionPending((m) => {
          const next = { ...m };
          delete next[key];
          return next;
        });
        return { ok: false, message: "Quantidade inválida." };
      }

      try {
        await putCarrinhoItemById(itemId, { quantidade: q });
        try {
          await loadCart({ silent: true });
        } catch {
          /* mantém POST/add pattern: PUT já persistiu */
        }
        return { ok: true };
      } catch (e) {
        return { ok: false, message: messageForCartAxiosError(e) };
      } finally {
        linePendingKeysRef.current.delete(key);
        setLineActionPending((m) => {
          const next = { ...m };
          delete next[key];
          return next;
        });
      }
    },
    [isAuthenticated, loadCart],
  );

  const removeItem = useCallback(
    async (itemId: string | number): Promise<CartMutationResult> => {
      if (!isAuthenticated) {
        return { ok: false, message: "Faça login para alterar o carrinho." };
      }
      const key = lineActionKey(itemId);
      if (linePendingKeysRef.current.has(key)) {
        return { ok: false, message: "Aguarde a operação anterior." };
      }
      linePendingKeysRef.current.add(key);
      setLineActionPending((m) => ({ ...m, [key]: true }));

      try {
        await deleteCarrinhoItemById(itemId);
        try {
          await loadCart({ silent: true });
        } catch {
          /* idem update */
        }
        return { ok: true };
      } catch (e) {
        return { ok: false, message: messageForCartAxiosError(e) };
      } finally {
        linePendingKeysRef.current.delete(key);
        setLineActionPending((m) => {
          const next = { ...m };
          delete next[key];
          return next;
        });
      }
    },
    [isAuthenticated, loadCart],
  );

  const value = useMemo(
    () => ({
      totalQuantity,
      cart,
      cartError,
      cartLoading,
      addPending,
      lineItemPending,
      refreshCart,
      addItemToCart,
      updateItemQuantity,
      removeItem,
    }),
    [
      totalQuantity,
      cart,
      cartError,
      cartLoading,
      addPending,
      lineItemPending,
      refreshCart,
      addItemToCart,
      updateItemQuantity,
      removeItem,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart deve ser usado dentro de CartProvider");
  return ctx;
}
