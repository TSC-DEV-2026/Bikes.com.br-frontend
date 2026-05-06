import { useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";

const PUBLIC_PATHS = new Set([
  "/",
  "/home",
  "/about",
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
  const { isAuthenticated, bootstrapped } = useAuth();

  useEffect(() => {
    if (!bootstrapped) return;

    const pathname = location.pathname;

    if (pathname.startsWith("/resetPassword") && !searchParams.get("token")) {
      navigate("/password", { replace: true });
      return;
    }

    const onAuthOnlyPath =
      ["/login", "/register", "/password"].includes(pathname) ||
      pathname.startsWith("/resetPassword");

    if (isAuthenticated && onAuthOnlyPath) {
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
    location.pathname,
    location.search,
    navigate,
    searchParams,
  ]);

  return null;
}
