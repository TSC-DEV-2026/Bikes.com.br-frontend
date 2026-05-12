import { LandingHero } from "@/components/landing/LandingHero";
import {
  BenefitsSection,
  CategoriesSection,
  FeaturedSection,
  LandingFooter,
} from "@/components/landing/LandingSections";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingHero />
      <BenefitsSection />
      <CategoriesSection />
      <FeaturedSection />
      <LandingFooter />
    </div>
  );
}
