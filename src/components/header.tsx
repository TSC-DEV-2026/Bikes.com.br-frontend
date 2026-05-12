import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import { useFavoritesCount } from "@/contexts/favorites-count-context";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import {
  HiCog,
  HiUsers,
  HiPhone,
  HiHome,
  HiInformationCircle,
  HiShoppingCart,
  HiHeart,
} from "react-icons/hi";
import { BiLogOut } from "react-icons/bi";
import { IoPersonCircle } from "react-icons/io5";
import { RxHamburgerMenu } from "react-icons/rx";

export function Header() {
  const { user, isAuthenticated, logout, bootstrapped } = useAuth();
  const { unseenFavoriteCount, favoritesBadgeVisible } = useFavoritesCount();

  // FIX: evita mismatch SSR/CSR (hydration)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  const showFavoritesBadge = mounted && bootstrapped && favoritesBadgeVisible;

  const homePath = mounted && bootstrapped && isAuthenticated ? "/home" : "/";

  return (
    <header className="fixed top-0 left-0 w-full bg-white shadow-md flex items-center justify-between p-4 z-50">
      <Link to={homePath} className="shrink-0">
        <img src="/img/logo.png" alt="Logo do Projeto" width={100} height={50} />
      </Link>

      <nav className="hidden md:flex space-x-6 text-lg font-medium">
        <Link to={homePath} className="hover:text-gray-600">
          Página Inicial
        </Link>
        <Link to="/about" className="hover:text-gray-600">
          Quem somos
        </Link>
        <Link to="/enterprise" className="hover:text-gray-600">
          Vender
        </Link>
        <Link to="#contact" className="hover:text-gray-600">
          Contato
        </Link>
      </nav>

      <div className="hidden md:flex items-center space-x-4">
        <Link to="/produtos" title="Ver produtos">
          <img src="/img/carrinho.png" alt="Carrinho" width={27} height={27} />
        </Link>
        <Link
          to="/favorites"
          className="relative inline-block"
          title={
            favoritesBadgeVisible
              ? `Favoritos: ${unseenFavoriteCount} ${unseenFavoriteCount === 1 ? "novo" : "novos"}`
              : "Favoritos"
          }
          aria-label={
            favoritesBadgeVisible
              ? `Favoritos, ${unseenFavoriteCount} ${unseenFavoriteCount === 1 ? "produto ainda não visto" : "produtos ainda não vistos"} na lista`
              : "Favoritos"
          }
        >
          <img
            src="/img/favoritos.png"
            alt=""
            width={27}
            height={27}
            aria-hidden
          />
          {showFavoritesBadge ? (
            <span
              className="absolute -right-1 -top-0.5 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white shadow-sm tabular-nums"
              aria-hidden
            >
              {unseenFavoriteCount > 99 ? "99+" : unseenFavoriteCount}
            </span>
          ) : null}
        </Link>

        {!mounted || !bootstrapped ? (
          <div className="w-[90px] h-[42px]" aria-hidden />
        ) : isAuthenticated ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="rounded-full cursor-pointer hover:opacity-80 transition-opacity"
                aria-label="Menu do usuário"
              >
                <img
                  src="/img/user.png"
                  alt="Usuário"
                  width={30}
                  height={30}
                  className="rounded-full"
                />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="z-[9999] bg-white border border-gray-200 shadow-xl rounded-md min-w-[200px]"
            >
              <DropdownMenuItem className="hover:bg-gray-100 focus:bg-gray-100 data-[highlighted]:bg-gray-100">
                <Link
                  to="/user"
                  tabIndex={-1}
                  onPointerDown={(e) => e.preventDefault()}
                  className="flex items-center w-full py-1 px-2"
                >
                  <IoPersonCircle className="mr-2 text-gray-700" size={18} />
                  <span className="text-gray-800">
                    {user?.name || "Usuário"}
                  </span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem className="hover:bg-gray-100 focus:bg-gray-100 data-[highlighted]:bg-gray-100">
                <Link
                  to="/home"
                  tabIndex={-1}
                  onPointerDown={(e) => e.preventDefault()}
                  className="flex items-center w-full py-1 px-2"
                >
                  <HiHome className="mr-2 text-gray-700" size={18} />
                  <span className="text-gray-800">Página Inicial</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem className="hover:bg-gray-100 focus:bg-gray-100 data-[highlighted]:bg-gray-100">
                <Link
                  to="/user"
                  tabIndex={-1}
                  onPointerDown={(e) => e.preventDefault()}
                  className="flex items-center w-full py-1 px-2"
                >
                  <HiCog className="mr-2 text-gray-700" size={18} />
                  <span className="text-gray-800">Configurações</span>
                </Link>
              </DropdownMenuItem>

              <div className="border-t border-gray-200 my-1"></div>

              <DropdownMenuItem
                onClick={logout}
                className="text-red-600 transition-colors hover:bg-red-100 focus:bg-red-50 data-[highlighted]:bg-red-100 hover:cursor-pointer"
              >
                <div className="flex items-center w-full py-1 px-2">
                  <BiLogOut className="mr-2" size={18} />
                  <span>Sair</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link
            to="/login"
            className="text-lg font-medium hover:text-gray-600 px-4 py-2 rounded-md hover:bg-gray-100 transition-colors"
          >
            Entrar
          </Link>
        )}
      </div>

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" className="md:hidden scale-100">
            <RxHamburgerMenu />
          </Button>
        </SheetTrigger>

        {/* FIX: z-index do Sheet acima do header */}
        <SheetContent side="right" className="w-64 bg-white z-[9999]">
          <div className="p-4 h-full flex flex-col">
            <SheetHeader className="p-0 mb-6">
              <SheetTitle className="text-xl font-semibold">Menu</SheetTitle>
            </SheetHeader>

            <nav className="space-y-4 flex-1">
              <Link
                to={homePath}
                onClick={closeMobileMenu}
                className="flex items-center space-x-3 text-lg py-2 hover:bg-gray-100 rounded px-2"
              >
                <HiHome />
                <span>Página Inicial</span>
              </Link>
              <Link
                to="/about"
                onClick={closeMobileMenu}
                className="flex items-center space-x-3 text-lg py-2 hover:bg-gray-100 rounded px-2"
              >
                <HiInformationCircle />
                <span>Quem somos</span>
              </Link>

              <Link
                to="/enterprise"
                onClick={closeMobileMenu}
                className="flex items-center space-x-3 text-lg py-2 hover:bg-gray-100 rounded px-2"
              >
                <HiUsers />
                <span>Vender</span>
              </Link>
              <Link
                to="#contact"
                onClick={closeMobileMenu}
                className="flex items-center space-x-3 text-lg py-2 hover:bg-gray-100 rounded px-2"
              >
                <HiPhone />
                <span>Contato</span>
              </Link>

              <Link
                to="/produtos"
                onClick={closeMobileMenu}
                className="flex items-center space-x-3 text-lg py-2 hover:bg-gray-100 rounded px-2"
                title="Ver produtos"
              >
                <HiShoppingCart aria-hidden />
                <span>Carrinho</span>
              </Link>

              <Link
                to="/favorites"
                onClick={closeMobileMenu}
                className="flex items-center space-x-3 text-lg py-2 hover:bg-gray-100 rounded px-2"
                title={
                  favoritesBadgeVisible
                    ? `Favoritos: ${unseenFavoriteCount} ${unseenFavoriteCount === 1 ? "novo" : "novos"}`
                    : "Favoritos"
                }
                aria-label={
                  favoritesBadgeVisible
                    ? `Favoritos, ${unseenFavoriteCount} ${unseenFavoriteCount === 1 ? "produto ainda não visto" : "produtos ainda não vistos"} na lista`
                    : "Favoritos"
                }
              >
                <HiHeart aria-hidden />
                <span className="relative">
                  Favoritos
                  {showFavoritesBadge ? (
                    <span
                      className="pointer-events-none absolute -right-4 top-0 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white shadow-sm tabular-nums"
                      aria-hidden
                    >
                      {unseenFavoriteCount > 99 ? "99+" : unseenFavoriteCount}
                    </span>
                  ) : null}
                </span>
              </Link>
            </nav>

            {!bootstrapped ? (
              <div
                className="border-t border-gray-200 pt-4 space-y-2"
                aria-busy="true"
                aria-label="Carregando sessão"
              >
                <div className="h-11 w-full rounded-md bg-gray-100 animate-pulse" />
                <div className="h-11 w-full rounded-md bg-gray-100 animate-pulse" />
              </div>
            ) : isAuthenticated ? (
              <div className="border-t border-gray-200 pt-4 space-y-2">
                <div className="flex items-center gap-3 rounded-md border border-[#09bc8a]/25 bg-[#09bc8a]/10 px-3 py-2.5">
                  <IoPersonCircle className="size-5 shrink-0 text-[#09bc8a]" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-base font-semibold leading-snug text-[#0c1b33]">
                    {user?.name || "Usuário"}
                  </span>
                </div>

                <Link
                  to="/user"
                  onClick={closeMobileMenu}
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 text-base font-medium leading-snug text-[#0c1b33] hover:bg-gray-100"
                >
                  <IoPersonCircle className="size-5 shrink-0 text-[#0c1b33]" aria-hidden />
                  <span className="min-w-0 flex-1">Perfil</span>
                </Link>

                <Link
                  to="/user"
                  onClick={closeMobileMenu}
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 text-base font-medium leading-snug text-[#0c1b33] hover:bg-gray-100"
                >
                  <HiCog className="size-5 shrink-0 text-[#0c1b33]" aria-hidden />
                  <span className="min-w-0 flex-1">Configurações</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    closeMobileMenu();
                    logout();
                  }}
                  className="flex w-full items-center gap-3 rounded-md border border-red-500 bg-white px-3 py-2.5 text-base font-medium leading-snug text-red-600 hover:bg-red-50"
                >
                  <BiLogOut className="size-5 shrink-0" aria-hidden />
                  <span className="min-w-0 flex-1 text-left">Sair</span>
                </button>
              </div>
            ) : (
              <div className="border-t border-gray-200 pt-4">
                <Link
                  to="/login"
                  onClick={closeMobileMenu}
                  className="flex items-center justify-center text-lg font-medium w-full py-2 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Entrar
                </Link>

                <Link
                  to="/register"
                  onClick={closeMobileMenu}
                  className="mt-2 flex items-center justify-center text-lg font-medium w-full py-2 rounded-md border border-gray-200 hover:bg-gray-100 transition-colors"
                >
                  Criar conta
                </Link>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
