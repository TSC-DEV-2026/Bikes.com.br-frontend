import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "@/app/utils/authFetch";

type User = { name: string; email: string };

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  /** Após a primeira validação com `/users/me` (equivale ao hidrato do middleware). */
  bootstrapped: boolean;
  setUserLocal: (u: User | null) => void;
  refreshMe: () => Promise<User | null>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const CACHE_KEY = "auth.user.cache.v1";

function readCache(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function writeCache(user: User | null) {
  if (typeof window === "undefined") return;
  try {
    if (!user) sessionStorage.removeItem(CACHE_KEY);
    else sessionStorage.setItem(CACHE_KEY, JSON.stringify(user));
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(() => readCache());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!readCache());
  const [bootstrapped, setBootstrapped] = useState(false);

  const setUserLocal = useCallback((u: User | null) => {
    setUser(u);
    setIsAuthenticated(!!u);
    writeCache(u);
  }, []);

  const refreshMe = useCallback(async (): Promise<User | null> => {
    try {
      const res = await authFetch("/users/me", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) throw new Error("unauthorized");

      const data = await res.json();
      const u: User = { name: data.nome, email: data.email };
      setUserLocal(u);
      return u;
    } catch {
      setUserLocal(null);
      return null;
    }
  }, [setUserLocal]);

  const logout = useCallback(async () => {
    try {
      await authFetch("/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } finally {
      setUserLocal(null);
      navigate("/login", { replace: true });
    }
  }, [navigate, setUserLocal]);

  useEffect(() => {
    void refreshMe().finally(() => setBootstrapped(true));
  }, [refreshMe]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated,
      bootstrapped,
      setUserLocal,
      refreshMe,
      logout,
    }),
    [user, isAuthenticated, bootstrapped, setUserLocal, refreshMe, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
