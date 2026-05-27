import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ref, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      ref={ref}
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-all outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus:border-[#09bc8a] focus:bg-[#eafaf2] focus:shadow-[0_0_10px_rgba(9,188,138,0.6)]", // Estilização ao focar
        "aria-invalid:border-destructive aria-invalid:shadow-[0_0_0_3px_rgba(220,38,38,0.3)]", // Estilização para estado inválido
        className
      )}
      {...props}
    />
  );
}

export { Input };