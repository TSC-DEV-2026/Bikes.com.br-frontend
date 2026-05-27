import { useEffect } from "react";
import { Navigate, Routes, Route, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";

// `/` = landing pública; `/home` = home logada; `/produtos` = listagem pública (paralela, ver paths.ts)
import LandingPage from "@/pages/landing/landing-page";
import HomePage from "@/pages/home/home-page";
import AboutPage from "@/pages/about/about-page";
import EnterprisePage from "@/pages/enterprise/enterprise-page";
import VenderEntryPage from "@/pages/vender/vender-entry-page";
import MinhaLojaPage from "@/pages/vender/minha-loja-page";
import VenderAnunciarPage from "@/pages/vender/vender-anunciar-page";
import VenderProdutoCreateIntroPage from "@/pages/vender/vender-produto-create-intro-page";
import VenderProdutoCreateFormPage from "@/pages/vender/vender-produto-create-form-page";
import VenderProdutoEditPage from "@/pages/vender/vender-produto-edit-page";
import UserPage from "@/pages/user/user-page";
import LoginPage from "@/pages/login/login-page";
import RegisterPage from "@/pages/register/register-page";
import PasswordPage from "@/pages/password/password-page";
import ResetPasswordPage from "@/pages/reset-password/reset-password-page";
import EditAddressPage from "@/pages/edit-address/edit-address-page";
import ProductsPage from "@/pages/products/products-page";
import ProductDetailPage from "@/pages/product-detail/product-detail-page";
import FavoritesPage from "@/pages/favorites/favorites-page";
import CartPage from "@/pages/cart/cart-page";

/**
 * Sobe a página para o topo a cada mudança de rota.
 * Mantém o scroll quando a navegação reusa a mesma rota (ex.: trocar apenas hash/?query).
 */
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}

function LandingRouteGate() {
  const { bootstrapped, isAuthenticated } = useAuth();

  if (!bootstrapped) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div
          className="size-10 animate-spin rounded-full border-4 border-[#09bc8a]/25 border-t-[#09bc8a]"
          aria-label="Carregando"
          role="status"
        />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  return <LandingPage />;
}

export function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LandingRouteGate />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/enterprise" element={<EnterprisePage />} />
        <Route path="/vender" element={<VenderEntryPage />} />
        <Route path="/vender/anunciar" element={<VenderAnunciarPage />} />
        <Route path="/vender/cadastro-produto" element={<VenderProdutoCreateIntroPage />} />
        <Route
          path="/vender/cadastro-produto/formulario"
          element={<VenderProdutoCreateFormPage />}
        />
        <Route path="/minha-loja" element={<MinhaLojaPage />} />
        <Route
          path="/minha-loja/produtos/:id"
          element={<ProductDetailPage mode="seller-preview" />}
        />
        <Route
          path="/minha-loja/produtos/:id/editar"
          element={<VenderProdutoEditPage />}
        />
        <Route path="/user" element={<UserPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/password" element={<PasswordPage />} />
        <Route path="/resetPassword" element={<ResetPasswordPage />} />
        <Route path="/editAddress/:id" element={<EditAddressPage />} />
        <Route path="/produtos" element={<ProductsPage />} />
        <Route path="/produtos/:id" element={<ProductDetailPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/carrinho" element={<CartPage />} />
      </Routes>
    </>
  );
}
