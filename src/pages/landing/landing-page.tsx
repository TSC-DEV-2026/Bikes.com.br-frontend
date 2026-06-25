import { Header } from "@/components/header";
import { LandingHero } from "@/components/landing/LandingHero";
import {
  BenefitsSection,
  LandingFooter,
} from "@/components/landing/LandingSections";
import { UltimosAnunciosSection } from "@/components/produto/ultimos-anuncios-section";
import { PUBLIC_MARKETPLACE_CONTAINER_CLASS } from "@/lib/public-marketplace-routes";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <LandingHero carouselMax={10} />
        <div className={PUBLIC_MARKETPLACE_CONTAINER_CLASS}>
          <UltimosAnunciosSection max={12} compact />
        </div>
        <BenefitsSection />
        <LandingFooter />
      </main>
    </div>
  );
}
