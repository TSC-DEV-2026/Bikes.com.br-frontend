import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link, useLocation } from "react-router-dom";
import { paths } from "@/api/endpoints";
import { useAuth } from "@/contexts/auth-context";
import { useSellerNav } from "@/hooks/use-seller-nav";
import { useCart } from "@/contexts/cart-context";
import { useFavoritesCount } from "@/contexts/favorites-count-context";
import { PublicMarketplaceHeader } from "@/components/public-marketplace-header";
import { isPublicMarketplacePath } from "@/lib/public-marketplace-routes";
import { cn } from "@/lib/utils";

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
  HiShoppingBag,
} from "react-icons/hi";
import { BiLogOut } from "react-icons/bi";
import { IoPersonCircle } from "react-icons/io5";
import { RxHamburgerMenu } from "react-icons/rx";

type HeaderNavItem = "home" | "about" | "vender" | "minhaLoja" | "contato";

function isNavItemActive(item: HeaderNavItem, pathname: string): boolean {
  switch (item) {
    case "home":
      return pathname === "/" || pathname === "/home";
    case "about":
      return (
        pathname.startsWith("/about") || pathname.startsWith("/quem-somos")
      );
    case "vender":
      return (
        pathname.startsWith("/vender") ||
        pathname.startsWith("/cadastro-produto")
      );
    case "minhaLoja":
      return pathname.startsWith("/minha-loja");
    case "contato":
      return pathname.startsWith("/contato");
    default:
      return false;
  }
}

/** Rotas mais específicas primeiro — evita Home como falso positivo no find. */
const NAV_ACTIVE_ORDER: HeaderNavItem[] = [
  "minhaLoja",
  "vender",
  "about",
  "contato",
  "home",
];

function getActiveNavKey(
  items: DesktopNavItem[],
  pathname: string,
): HeaderNavItem | null {
  for (const key of NAV_ACTIVE_ORDER) {
    if (
      items.some((item) => item.key === key) &&
      isNavItemActive(key, pathname)
    ) {
      return key;
    }
  }
  return null;
}

const DESKTOP_NAV_INDICATOR_WIDTH = 24;

/**
 * Persiste a posição entre montagens do Header (cada página renderiza seu próprio Header).
 * Só atualizar `left` após o frame inicial da animação — senão o StrictMode remonta
 * com prev === target e o deslize não roda.
 */
const desktopNavIndicatorStore = {
  left: null as number | null,
  rafId: 0,
};

type DesktopNavItem = {
  key: HeaderNavItem;
  to: string;
  label: string;
};

type HeaderDesktopNavProps = {
  pathname: string;
  homePath: string;
  showMinhaLoja: boolean;
};

function HeaderDesktopNav({
  pathname,
  homePath,
  showMinhaLoja,
}: HeaderDesktopNavProps) {
  const navRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<Partial<Record<HeaderNavItem, HTMLAnchorElement | null>>>(
    {},
  );
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [resizeSnap, setResizeSnap] = useState(false);
  const [resizeTick, setResizeTick] = useState(0);
  const resizeSnapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const items = useMemo<DesktopNavItem[]>(() => {
    const list: DesktopNavItem[] = [
      { key: "home", to: homePath, label: "Página Inicial" },
      { key: "about", to: "/about", label: "Quem somos" },
      { key: "vender", to: paths.venderAnunciar(), label: "Vender" },
    ];
    if (showMinhaLoja) {
      list.push({
        key: "minhaLoja",
        to: paths.minhaLoja(),
        label: "Minha loja",
      });
    }
    return list;
  }, [homePath, showMinhaLoja]);

  const activeKey = useMemo(
    () => getActiveNavKey(items, pathname),
    [items, pathname],
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useLayoutEffect(() => {
    const indicator = indicatorRef.current;
    const container = navRef.current;
    if (!indicator || !container) return;

    if (desktopNavIndicatorStore.rafId) {
      cancelAnimationFrame(desktopNavIndicatorStore.rafId);
      desktopNavIndicatorStore.rafId = 0;
    }

    if (!activeKey) {
      indicator.style.opacity = "0";
      return;
    }

    const link = linkRefs.current[activeKey];
    if (!link) return;

    const navRect = container.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    const barWidth = DESKTOP_NAV_INDICATOR_WIDTH;
    const targetLeft =
      linkRect.left - navRect.left + (linkRect.width - barWidth) / 2;

    const prevLeft = desktopNavIndicatorStore.left;
    const shouldAnimate =
      !reduceMotion &&
      !resizeSnap &&
      prevLeft !== null &&
      Math.abs(prevLeft - targetLeft) > 0.5;

    const transitionValue =
      "transform 300ms ease-out, opacity 200ms ease-out";

    indicator.style.width = `${barWidth}px`;
    indicator.style.opacity = "1";

    if (shouldAnimate) {
      indicator.style.transition = "none";
      indicator.style.transform = `translateX(${prevLeft}px)`;

      desktopNavIndicatorStore.rafId = requestAnimationFrame(() => {
        desktopNavIndicatorStore.rafId = requestAnimationFrame(() => {
          desktopNavIndicatorStore.rafId = 0;
          const el = indicatorRef.current;
          if (!el) return;
          el.style.transition = transitionValue;
          el.style.transform = `translateX(${targetLeft}px)`;
          desktopNavIndicatorStore.left = targetLeft;
        });
      });
    } else {
      indicator.style.transition = "none";
      indicator.style.transform = `translateX(${targetLeft}px)`;
      void indicator.offsetWidth;
      if (!reduceMotion && !resizeSnap) {
        indicator.style.transition = transitionValue;
      }
      desktopNavIndicatorStore.left = targetLeft;
    }
  }, [activeKey, pathname, items, reduceMotion, resizeSnap, resizeTick]);

  useEffect(() => {
    const handleResize = () => {
      setResizeSnap(true);
      setResizeTick((tick) => tick + 1);
      if (resizeSnapTimeoutRef.current) {
        clearTimeout(resizeSnapTimeoutRef.current);
      }
      resizeSnapTimeoutRef.current = setTimeout(() => {
        setResizeSnap(false);
      }, 50);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeSnapTimeoutRef.current) {
        clearTimeout(resizeSnapTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div ref={navRef} className="relative flex items-center gap-6 pb-0.5">
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <Link
            key={item.key}
            ref={(el) => {
              linkRefs.current[item.key] = el;
            }}
            to={item.to}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative z-10 inline-flex items-center whitespace-nowrap px-2 py-2 text-lg font-semibold transition-colors duration-200 ease-out",
              active
                ? "text-emerald-600"
                : "text-slate-900 hover:text-emerald-600",
            )}
          >
            {item.label}
          </Link>
        );
      })}
      <span
        ref={indicatorRef}
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 z-0 h-0.5 w-6 rounded-full bg-emerald-500 [opacity:0]"
      />
    </div>
  );
}

type HeaderNavLinkProps = {
  to: string;
  active: boolean;
  onClick?: () => void;
  children: ReactNode;
};

function HeaderNavLink({ to, active, onClick, children }: HeaderNavLinkProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center space-x-3 rounded px-2 py-2 text-lg transition-colors duration-200 ease-out",
        active
          ? "bg-emerald-50 font-semibold text-emerald-700"
          : "hover:bg-gray-100",
      )}
    >
      {children}
    </Link>
  );
}

export function Header() {
  const { pathname } = useLocation();
  const { isAuthenticated, bootstrapped } = useAuth();

  const showPublicMarketplaceHeader =
    isPublicMarketplacePath(pathname) && (!bootstrapped || !isAuthenticated);

  if (showPublicMarketplaceHeader) {
    return <PublicMarketplaceHeader />;
  }

  return <AuthenticatedHeader />;
}

function AuthenticatedHeader() {
  const { pathname } = useLocation();
  const { user, isAuthenticated, logout, bootstrapped } = useAuth();
  const { hasSeller, ready: sellerNavReady } = useSellerNav();
  const { totalQuantity } = useCart();
  const { unseenFavoriteCount, favoritesBadgeVisible } = useFavoritesCount();

  // FIX: evita mismatch SSR/CSR (hydration)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  const showFavoritesBadge = mounted && bootstrapped && favoritesBadgeVisible;
  const showCartBadge =
    mounted && bootstrapped && isAuthenticated && totalQuantity > 0;

  const homePath = mounted && bootstrapped && isAuthenticated ? "/home" : "/";
  const showMinhaLoja =
    mounted && bootstrapped && isAuthenticated && sellerNavReady && hasSeller;

  return (
    <header className="fixed top-0 left-0 z-50 flex min-w-0 w-full items-center justify-between gap-2 bg-white p-4 shadow-md sm:gap-4">
      <Link to={homePath} className="shrink-0">
        <img src="/img/logo.png" alt="Logo do Projeto" width={100} height={50} />
      </Link>

      <nav className="hidden min-w-0 flex-1 justify-center md:flex">
        <HeaderDesktopNav
          pathname={pathname}
          homePath={homePath}
          showMinhaLoja={showMinhaLoja}
        />
      </nav>

      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <Link
          to="/carrinho"
          className="relative inline-block"
          title={
            showCartBadge
              ? `Carrinho: ${totalQuantity} ${totalQuantity === 1 ? "item" : "itens"}`
              : "Abrir carrinho"
          }
          aria-label={
            showCartBadge
              ? `Carrinho com ${totalQuantity} ${totalQuantity === 1 ? "item" : "itens"}`
              : "Abrir carrinho"
          }
        >
          <img src="/img/carrinho.png" alt="" width={27} height={27} aria-hidden />
          {showCartBadge ? (
            <span
              className="absolute -right-2 -top-2 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-yellow-400 px-1 text-[10px] font-bold leading-none text-slate-900 ring-2 ring-white shadow-sm tabular-nums"
              aria-hidden
            >
              {totalQuantity > 99 ? "99+" : totalQuantity}
            </span>
          ) : null}
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

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" className="shrink-0 scale-100 md:hidden" aria-label="Abrir menu">
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
              <HeaderNavLink
                to={homePath}
                active={isNavItemActive("home", pathname)}
                onClick={closeMobileMenu}
              >
                <HiHome />
                <span>Página Inicial</span>
              </HeaderNavLink>
              <HeaderNavLink
                to="/about"
                active={isNavItemActive("about", pathname)}
                onClick={closeMobileMenu}
              >
                <HiInformationCircle />
                <span>Quem somos</span>
              </HeaderNavLink>

              <HeaderNavLink
                to={paths.venderAnunciar()}
                active={isNavItemActive("vender", pathname)}
                onClick={closeMobileMenu}
              >
                <HiUsers />
                <span>Vender</span>
              </HeaderNavLink>
              {showMinhaLoja ? (
                <HeaderNavLink
                  to={paths.minhaLoja()}
                  active={isNavItemActive("minhaLoja", pathname)}
                  onClick={closeMobileMenu}
                >
                  <HiShoppingBag />
                  <span>Minha loja</span>
                </HeaderNavLink>
              ) : null}
              

              <Link
                to="/carrinho"
                onClick={closeMobileMenu}
                className="flex items-center space-x-3 text-lg py-2 hover:bg-gray-100 rounded px-2"
                title={
                  showCartBadge
                    ? `Carrinho: ${totalQuantity} ${totalQuantity === 1 ? "item" : "itens"}`
                    : "Abrir carrinho"
                }
                aria-label={
                  showCartBadge
                    ? `Carrinho com ${totalQuantity} ${totalQuantity === 1 ? "item" : "itens"}`
                    : "Abrir carrinho"
                }
              >
                <HiShoppingCart aria-hidden />
                <span className="relative">
                  Carrinho
                  {showCartBadge ? (
                    <span
                      className="pointer-events-none absolute -right-5 -top-2 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-yellow-400 px-1 text-[9px] font-bold leading-none text-slate-900 ring-2 ring-white shadow-sm tabular-nums"
                      aria-hidden
                    >
                      {totalQuantity > 99 ? "99+" : totalQuantity}
                    </span>
                  ) : null}
                </span>
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
      </div>
    </header>
  );
}

