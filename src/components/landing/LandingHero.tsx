import { MarketplaceCategoryNav } from "@/components/produto/marketplace-category-nav";
import { MarketplacePromoBanner } from "@/components/produto/marketplace-promo-banner";
import { RecentProductsCarousel } from "@/components/produto/recent-products-carousel";
import {
  PUBLIC_MARKETPLACE_CONTAINER_CLASS,
  PUBLIC_MARKETPLACE_HEADER_OFFSET_CLASS,
} from "@/lib/public-marketplace-routes";
import { cn } from "@/lib/utils";

export type LandingHeroProps = {
  className?: string;
  carouselMax?: number;
  /** Iguala altura dos cards no carrossel (home pública). */
  uniformCards?: boolean;
};

/**
 * Topo público: banner promocional + categorias + produtos recentes (busca no header).
 * Banner e vitrine de produtos são blocos distintos.
 */
export function LandingHero({
  className,
  carouselMax = 10,
  uniformCards = false,
}: LandingHeroProps) {
  return (
    <section
      className={cn(
        "border-b border-slate-200/80 bg-white",
        PUBLIC_MARKETPLACE_HEADER_OFFSET_CLASS,
        className,
      )}
    >
      <div
        className={cn(
          PUBLIC_MARKETPLACE_CONTAINER_CLASS,
          "space-y-4 pb-4 pt-2 sm:space-y-5 sm:pb-5",
        )}
      >
        <MarketplacePromoBanner />
        <MarketplaceCategoryNav />
        <div className="pt-2 sm:pt-3">
          <RecentProductsCarousel max={carouselMax} uniformCards={uniformCards} />
        </div>
      </div>
    </section>
  );
}
