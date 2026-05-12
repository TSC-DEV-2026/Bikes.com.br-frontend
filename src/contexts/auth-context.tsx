import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import { authFetch } from "@/api/authFetch";
import { authRoutes } from "@/api/endpoints";
import { notifySuccess } from "@/lib/toast";

type User = { name: string; email: string };

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  isLoggingOut: boolean;
  /** Após a primeira validação com `/auth/me`. */
  bootstrapped: boolean;
  setUserLocal: (u: User | null) => void;
  refreshMe: () => Promise<User | null>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const CACHE_KEY = "auth.user.cache.v1";

function writeCache(user: User | null) {
  if (typeof window === "undefined") return;
  try {
    if (!user) localStorage.removeItem(CACHE_KEY);
    else localStorage.setItem(CACHE_KEY, JSON.stringify(user));
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  /** Sem hidratar a partir do cache: só estado confirmado pelo `/auth/me` (ou fluxo pós-login). */
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);

  const setUserLocal = useCallback((u: User | null) => {
    setUser(u);
    setIsAuthenticated(!!u);
    writeCache(u);
  }, []);

  const refreshMe = useCallback(async (): Promise<User | null> => {
    try {
      const res = await authFetch("/auth/me", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setUserLocal(null);
        }
        return null;
      }

      const data = (await res.json()) as Record<string, unknown>;
      const pessoa = data?.pessoa as Record<string, unknown> | undefined;
      const u: User = {
        name:
          (typeof pessoa?.nome_completo === "string" ? pessoa.nome_completo : null) ??
          (typeof data?.nome === "string" ? data.nome : null) ??
          (typeof data?.name === "string" ? data.name : null) ??
          "",
        email: typeof data?.email === "string" ? data.email : "",
      };
      setUserLocal(u);
      return u;
    } catch (e: unknown) {
      if (isAxiosError(e)) {
        const status = e.response?.status;
        if (status === 401 || status === 403) {
          setUserLocal(null);
          return null;
        }
        if (!e.response) {
          setUserLocal(null);
          return null;
        }
      }
      setUserLocal(null);
      return null;
    }
  }, [setUserLocal]);

  const logout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await authRoutes.logout();
    } catch {
      // Idempotente: backend pode responder 401 se cookie já expirou.
    } finally {
      setUserLocal(null);
      notifySuccess("Você saiu da sua conta.");
      navigate("/", { replace: true });
      // Libera os redirects automáticos somente depois do redirect para `/`.
      // (evita corrida: /home -> /login quando auth cai no meio do logout)
      queueMicrotask(() => setIsLoggingOut(false));
    }
  }, [navigate, setUserLocal]);

  useEffect(() => {
    void refreshMe().finally(() => setBootstrapped(true));
  }, [refreshMe]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated,
      isLoggingOut,
      bootstrapped,
      setUserLocal,
      refreshMe,
      logout,
    }),
    [user, isAuthenticated, isLoggingOut, bootstrapped, setUserLocal, refreshMe, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
