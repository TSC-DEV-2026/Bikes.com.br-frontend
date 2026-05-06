import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";

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
} from "react-icons/hi";
import { BiLogOut } from "react-icons/bi";
import { IoPersonCircle } from "react-icons/io5";
import { RxHamburgerMenu } from "react-icons/rx";

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();

  // FIX: evita mismatch SSR/CSR (hydration)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <header className="fixed top-0 left-0 w-full bg-white shadow-md flex items-center justify-between p-4 z-50">
      <img src="/img/logo.png" alt="Logo do Projeto" width={100} height={50} />

      <nav className="hidden md:flex space-x-6 text-lg font-medium">
        <Link to="/home" className="hover:text-gray-600">
          Página Inicial
        </Link>
        <Link to="/about" className="hover:text-gray-600">
          Quem somos
        </Link>
        <Link to="/sell" className="hover:text-gray-600">
          Vender
        </Link>
        <Link to="#contact" className="hover:text-gray-600">
          Contato
        </Link>
      </nav>

      <div className="hidden md:flex items-center space-x-4">
        <Link to="/cart">
          <img src="/img/carrinho.png" alt="Carrinho" width={27} height={27} />
        </Link>
        <Link to="/favorites">
          <img
            src="/img/favoritos.png"
            alt="Favoritos"
            width={27}
            height={27}
          />
        </Link>

        {!mounted ? (
          <div className="w-[90px] h-[42px]" />
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
              <DropdownMenuItem className="hover:bg-gray-50 focus:bg-gray-50">
                <Link
                  to="/user"
                  className="flex items-center w-full py-1 px-2"
                >
                  <IoPersonCircle className="mr-2 text-gray-700" size={18} />
                  <span className="text-gray-800">
                    {user?.name || "Usuário"}
                  </span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem className="hover:bg-gray-50 focus:bg-gray-50">
                <Link
                  to="/home"
                  className="flex items-center w-full py-1 px-2"
                >
                  <HiHome className="mr-2 text-gray-700" size={18} />
                  <span className="text-gray-800">Página Inicial</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem className="hover:bg-gray-50 focus:bg-gray-50">
                <Link
                  to="/config"
                  className="flex items-center w-full py-1 px-2"
                >
                  <HiCog className="mr-2 text-gray-700" size={18} />
                  <span className="text-gray-800">Configurações</span>
                </Link>
              </DropdownMenuItem>

              <div className="border-t border-gray-200 my-1"></div>

              <DropdownMenuItem
                onClick={logout}
                className="hover:bg-red-50 focus:bg-red-50 text-red-600 hover:cursor-pointer"
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

      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" className="md:hidden scale-150">
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
                to="/home"
                className="flex items-center space-x-3 text-lg py-2 hover:bg-gray-100 rounded px-2"
              >
                <HiHome />
                <span>Página Inicial</span>
              </Link>
              <Link
                to="/about"
                className="flex items-center space-x-3 text-lg py-2 hover:bg-gray-100 rounded px-2"
              >
                <HiInformationCircle />
                <span>Quem somos</span>
              </Link>

              <Link
                to="/sell"
                className="flex items-center space-x-3 text-lg py-2 hover:bg-gray-100 rounded px-2"
              >
                <HiUsers />
                <span>Vender</span>
              </Link>
              <Link
                to="#contact"
                className="flex items-center space-x-3 text-lg py-2 hover:bg-gray-100 rounded px-2"
              >
                <HiPhone />
                <span>Contato</span>
              </Link>
            </nav>

            {isAuthenticated ? (
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center space-x-3 mb-4 px-2">
                  <IoPersonCircle className="text-2xl text-gray-700" />
                  <span className="font-medium text-gray-800">
                    {user?.name || "Usuário"}
                  </span>
                </div>

                <Link
                  to="/user"
                  className="flex items-center space-x-3 text-lg py-2 hover:bg-gray-100 rounded px-2 mb-2"
                >
                  <IoPersonCircle />
                  <span>Perfil</span>
                </Link>

                <Link
                  to="/config"
                  className="flex items-center w-full py-1 px-2"
                >
                  <HiCog className="mr-2 text-gray-700" size={18} />
                  <span className="text-gray-800">Configurações</span>
                </Link>

                <button
                  onClick={logout}
                  className="flex items-center space-x-3 text-lg py-2 hover:bg-red-50 rounded px-2 w-full text-red-600"
                >
                  <BiLogOut />
                  <span>Sair</span>
                </button>
              </div>
            ) : (
              <div className="border-t border-gray-200 pt-4">
                <Link
                  to="/login"
                  className="flex items-center justify-center text-lg font-medium w-full py-2 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Entrar
                </Link>

                <Link
                  to="/register"
                  className="mt-2 flex items-center justify-center text-lg font-medium w-full py-2 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
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
