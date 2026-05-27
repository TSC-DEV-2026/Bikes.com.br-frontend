import type { ReactNode } from "react";
import { Pencil } from "lucide-react";

import { cn } from "@/lib/utils";

type ShellProps = {
  enabled: boolean;
  children: ReactNode;
  onRequestEdit: () => void;
  className?: string;
  label?: string;
};

/**
 * Wrapper clicável para campos do preview do vendedor (abre dialog de edição).
 */
export function SellerPreviewInlineShell({
  enabled,
  children,
  onRequestEdit,
  className,
  label = "Clique para editar",
}: ShellProps) {
  if (!enabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        "group relative min-w-0 max-w-full cursor-pointer rounded-xl text-left transition-colors hover:bg-emerald-50/40 hover:ring-2 hover:ring-emerald-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400",
        className,
      )}
      onClick={onRequestEdit}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onRequestEdit();
        }
      }}
    >
      <span
        className={cn(
          "pointer-events-none absolute right-2 top-2 z-[1] hidden items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white shadow-sm group-hover:flex",
        )}
        aria-hidden
      >
        <Pencil className="size-3" />
        Editar
      </span>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
