/** Rotas da vitrine pública que compartilham o header de marketplace. */
export function isPublicMarketplacePath(pathname: string): boolean {
  if (pathname === "/" || pathname === "/home") return true;
  if (pathname === "/produtos" || pathname.startsWith("/produtos/")) return true;
  return false;
}

/** Container alinhado entre header, home e listagem pública. */
export const PUBLIC_MARKETPLACE_CONTAINER_CLASS =
  "mx-auto w-full max-w-[1280px] px-4 sm:px-5";

/** Espaço abaixo do header público fixo (altura única em todas as breakpoints). */
export const PUBLIC_MARKETPLACE_HEADER_OFFSET_CLASS = "pt-14";
