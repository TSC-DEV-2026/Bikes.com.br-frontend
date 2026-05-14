import React from "react";
import { AuthProvider } from "@/contexts/auth-context";
import { CartProvider } from "@/contexts/cart-context";
import { FavoritesCountProvider } from "@/contexts/favorites-count-context";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <FavoritesCountProvider>
        <CartProvider>
          {children}
          <Toaster
            position="bottom-right"
            richColors
            toastOptions={{
              unstyled: true,
              classNames: {
                toast:
                  "!opacity-100 bg-white border border-gray-200 text-gray-800 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.25)] rounded-md px-4 py-3 flex items-start gap-3 max-w-[360px] w-full",
                title: "font-bold text-sm",
                description: "text-sm text-gray-600",
                success:
                  "!opacity-100 !border-[#09bc8a]/50 !bg-[#e8f5f1] !text-[#0c1b33]",
                error: "!opacity-100 !border-red-200 !bg-red-50 !text-red-900",
                warning: "!opacity-100 !border-amber-200 !bg-amber-50 !text-amber-950",
                info: "!opacity-100 !border-blue-200 !bg-blue-50 !text-blue-950",
                actionButton:
                  "bg-[#09bc8a] hover:bg-[#07a77a] text-white px-3 py-1 rounded-md text-sm font-medium",
                cancelButton:
                  "bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded-md text-sm font-medium",
              },
            }}
          />
        </CartProvider>
      </FavoritesCountProvider>
    </AuthProvider>
  );
}
