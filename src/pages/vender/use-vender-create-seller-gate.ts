import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { vendedoresRoutes, paths } from "@/api/endpoints";
import { useAuth } from "@/contexts/auth-context";
import { notifySellerNavChanged } from "@/hooks/use-seller-nav";
import { getAxiosErrorMessage } from "@/lib/api-error";
import { parseVendedor, type Vendedor } from "@/types/vendedor";

export function useVenderCreateSellerGate() {
  const navigate = useNavigate();
  const { bootstrapped, isAuthenticated } = useAuth();
  const [vendedor, setVendedor] = useState<Vendedor | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsSellerAccount, setNeedsSellerAccount] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    setNeedsSellerAccount(false);
    setLoading(true);
    try {
      const res = await vendedoresRoutes.getMeuVendedor();
      if (res.status === 404) {
        setVendedor(null);
        setNeedsSellerAccount(true);
        return;
      }
      if (res.status !== 200) {
        setLoadError(`Resposta inesperada (HTTP ${res.status}).`);
        setVendedor(null);
        return;
      }
      const v = parseVendedor(res.data);
      if (!v) {
        setLoadError("Não foi possível interpretar os dados da loja.");
        setVendedor(null);
        return;
      }
      if (v.status.toLowerCase() === "blocked") {
        setVendedor(v);
        return;
      }
      if (!v.ativo) {
        navigate(paths.minhaLoja(), {
          replace: true,
          state: { aviso: "inativa" },
        });
        return;
      }
      setVendedor(v);
    } catch (e) {
      setLoadError(getAxiosErrorMessage(e));
      setVendedor(null);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const handleSellerCreated = useCallback((v: Vendedor) => {
    setVendedor(v);
    setNeedsSellerAccount(false);
    setLoadError(null);
    setLoading(false);
    notifySellerNavChanged();
  }, []);

  useEffect(() => {
    if (!bootstrapped || !isAuthenticated) return;
    void load();
  }, [bootstrapped, isAuthenticated, load]);

  const awaitingAuthBootstrap = !bootstrapped;
  const needLogin = bootstrapped && !isAuthenticated;
  const blocked = vendedor?.status.toLowerCase() === "blocked";
  const pending = vendedor?.status.toLowerCase() === "pending";
  const contaActive = vendedor?.status.toLowerCase() === "active";
  const canCreate =
    Boolean(vendedor) && !blocked && Boolean(vendedor?.ativo) && (contaActive || pending);
  const showContaIndisponivel =
    Boolean(vendedor) && !blocked && Boolean(vendedor?.ativo) && !contaActive && !pending;

  return {
    bootstrapped,
    isAuthenticated,
    vendedor,
    loadError,
    loading,
    load,
    handleSellerCreated,
    awaitingAuthBootstrap,
    needLogin,
    blocked,
    pending,
    canCreate,
    needsSellerAccount,
    showContaIndisponivel,
  };
}
