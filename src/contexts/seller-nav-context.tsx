import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { vendedoresRoutes } from "@/api/endpoints";
import { useAuth } from "@/contexts/auth-context";

const SELLER_NAV_CHANGED = "bikes:seller-nav-changed";

export function notifySellerNavChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SELLER_NAV_CHANGED));
}

type SellerNavContextValue = {
  hasSeller: boolean;
  ready: boolean;
  refresh: (options?: { silent?: boolean }) => Promise<void>;
};

const SellerNavContext = createContext<SellerNavContextValue | null>(null);

export function SellerNavProvider({ children }: { children: React.ReactNode }) {
  const { bootstrapped, isAuthenticated } = useAuth();
  const [hasSeller, setHasSeller] = useState(false);
  const [ready, setReady] = useState(false);
  const hasResolvedOnceRef = useRef(false);

  const refresh = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!bootstrapped) return;

      if (!isAuthenticated) {
        setHasSeller(false);
        setReady(true);
        hasResolvedOnceRef.current = false;
        return;
      }

      if (!options?.silent && !hasResolvedOnceRef.current) {
        setReady(false);
      }

      try {
        const res = await vendedoresRoutes.getMeuVendedor();
        setHasSeller(res.status === 200);
      } catch {
        setHasSeller(false);
      } finally {
        hasResolvedOnceRef.current = true;
        setReady(true);
      }
    },
    [bootstrapped, isAuthenticated],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onChange = () => void refresh({ silent: true });
    window.addEventListener(SELLER_NAV_CHANGED, onChange);
    return () => window.removeEventListener(SELLER_NAV_CHANGED, onChange);
  }, [refresh]);

  const value = useMemo<SellerNavContextValue>(
    () => ({ hasSeller, ready, refresh }),
    [hasSeller, ready, refresh],
  );

  return (
    <SellerNavContext.Provider value={value}>{children}</SellerNavContext.Provider>
  );
}

export function useSellerNav() {
  const ctx = useContext(SellerNavContext);
  if (!ctx) {
    throw new Error("useSellerNav deve ser usado dentro de SellerNavProvider");
  }
  return ctx;
}
