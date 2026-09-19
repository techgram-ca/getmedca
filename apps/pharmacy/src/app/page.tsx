import { LandingNavbar } from "@/components/landing/navbar";
import { LandingHero } from "@/components/landing/hero";
import { Features, FinalCta, MarketOpportunity, Problem, Solution, WhyGetMed } from "@/components/landing/sections";

export default function GetStartedPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingNavbar />
      <main>
        <LandingHero />
        <MarketOpportunity />
        <Problem />
        <Solution />
        <Features />
        <WhyGetMed />
        <FinalCta />
      </main>
    </div>
  );
}
