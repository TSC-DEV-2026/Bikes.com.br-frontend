import { useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";

type BackButtonProps = {
  /** Texto opcional. */
  label?: string;
  /**
   * Tela para onde o botão leva (fluxo do app), ex.: produto → `/home`.
   * Não usa histórico do navegador (`history.back`).
   * Default: `/home` se logado, senão `/`.
   */
  fallbackTo?: string;
  /** Tailwind extra para ajustar em cada tela. */
  className?: string;
  /** Variante do botão (shadcn). */
  variant?: React.ComponentProps<typeof Button>["variant"];
};

export function BackButton({
  label = "Voltar",
  fallbackTo,
  className,
  variant = "outline",
}: BackButtonProps) {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const { isAuthenticated } = useAuth();

  const computedFallback = useMemo(() => {
    if (fallbackTo && fallbackTo.startsWith("/")) return fallbackTo;
    return isAuthenticated ? "/home" : "/";
  }, [fallbackTo, isAuthenticated]);

  const onBack = useCallback(() => {
    navigate(computedFallback);
  }, [computedFallback, navigate]);

  return (
    <Button
      type="button"
      variant={variant}
      className={className ?? "gap-2 hover:!bg-muted/40 active:bg-muted/40"}
      onClick={onBack}
      aria-label={`Voltar${pathname ? ` (${pathname}${search})` : ""}`}
      title="Voltar"
    >
      <ArrowLeft className="size-4" aria-hidden />
      {label}
    </Button>
  );
}
