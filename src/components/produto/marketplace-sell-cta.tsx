import { Link } from "react-router-dom";
import { FaBicycle } from "react-icons/fa6";

import { MARKETPLACE_SELL_CTA_HREF } from "@/lib/marketplace-quick-filters";
import { cn } from "@/lib/utils";

type MarketplaceSellCtaProps = {
  variant?: "button" | "link";
  className?: string;
};

export function MarketplaceSellCta({
  variant = "button",
  className,
}: MarketplaceSellCtaProps) {
  if (variant === "link") {
    return (
      <Link
        to={MARKETPLACE_SELL_CTA_HREF}
        className={cn(
          "text-sm font-medium text-gray-600 hover:text-[#09bc8a] hover:underline",
          className,
        )}
      >
        Anunciar produto
      </Link>
    );
  }

  return (
    <Link
      to={MARKETPLACE_SELL_CTA_HREF}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg border border-[#0c1b33]/15 bg-white px-4 py-2 text-sm font-bold text-[#0c1b33] shadow-sm transition hover:border-[#09bc8a]/40 hover:text-[#09bc8a]",
        className,
      )}
    >
      <FaBicycle className="size-3.5 shrink-0" aria-hidden />
      Vender minha bike
    </Link>
  );
}
