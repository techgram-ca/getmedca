import { ComingSoon } from "@/components/coming-soon";
import { HomeHero } from "@/components/home-hero";
import { HowItWorksSection } from "@/components/how-it-works-section";
import { WhyChooseSection } from "@/components/why-choose-section";
import { getLaunchState } from "@/lib/launch";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { launched, message } = await getLaunchState();
  if (!launched) return <ComingSoon message={message} />;

  return (
    <>
      <HomeHero />
      <HowItWorksSection />
      <WhyChooseSection />
      <section id="get-started" className="bg-brand-600 px-6 py-20 text-center">
        <h2 className="text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold tracking-tight text-white">Support Local Pharmacies</h2>
        <p className="mx-auto mt-3 max-w-[540px] text-base text-white/80">
          Every order placed through GetMed goes directly to an independent, community-owned pharmacy. Choose local — and help your neighbourhood grow together.
        </p>
      </section>
    </>
  );
}
