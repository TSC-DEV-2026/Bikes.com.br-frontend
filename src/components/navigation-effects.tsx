import { useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";

const PUBLIC_PATHS = new Set([
  "/",
  "/about",
  "/enterprise",
  "/cart",
  // `/home` é a rota "logada", mas quando deslogado ela já renderiza a landing;
  // tratá-la como pública evita corrida no logout ("/home" -> "/login") e permite
  // o redirect explícito do logout para `/`.
  "/home",
  "/login",
  "/register",
  "/password",
  "/resetPassword",
]);

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/resetPassword")) return true;
  return false;
}

/**
 * Replica as regras do antigo middleware Next (cookies + redirects na borda)
 * com base no estado de auth após validação via API (`refreshMe`).
 */
export function NavigationEffects() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isLoggingOut, bootstrapped } = useAuth();

  useEffect(() => {
    if (!bootstrapped) return;
    if (isLoggingOut) return;

    const pathname = location.pathname;

    if (pathname.startsWith("/resetPassword") && !searchParams.get("token")) {
      navigate("/password", { replace: true });
      return;
    }

    if (isAuthenticated && pathname === "/") {
      navigate("/home", { replace: true });
      return;
    }

    if (isAuthenticated && ["/login", "/register"].includes(pathname)) {
      navigate("/home", { replace: true });
      return;
    }

    if (!isAuthenticated && !isPublicPath(pathname)) {
      const next = pathname + location.search;
      navigate(`/login?next=${encodeURIComponent(next)}`, { replace: true });
    }
  }, [
    bootstrapped,
    isAuthenticated,
    isLoggingOut,
    location.pathname,
    location.search,
    navigate,
    searchParams,
  ]);

  return null;
}
