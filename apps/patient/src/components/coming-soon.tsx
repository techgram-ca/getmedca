import { Clock, MapPin } from "lucide-react";
import { Button, Logo, SectionLabel } from "@getmed/ui";
import { HowItWorksSection } from "@/components/how-it-works-section";
import { WhyChooseSection } from "@/components/why-choose-section";

const FALLBACK =
  "We're getting GetMed ready for Ontario. Prescription delivery from the pharmacies you already use, brought to your door — opening soon.";

/**
 * The public site before launch.
 *
 * No header and no footer, because every link in them leads somewhere that
 * cannot be used yet, and a navigation bar whose every destination refuses you
 * is worse than none. What stays is the part that still does a job: an
 * explanation of what this is and why it is worth waiting for.
 *
 * Pharmacy pages are deliberately not behind this. Showing a pharmacy its own
 * page is most of what the period before launch is for.
 */
export function ComingSoon({ message }: { message: string | null }) {
  return (
    <div className="flex min-h-screen flex-col">
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white px-6 py-24 sm:py-32">
        <div className="mx-auto flex max-w-[780px] flex-col items-center text-center">
          <Logo className="mb-10" />

          <span className="inline-flex items-center gap-2 rounded-full border border-brand-600/20 bg-brand-100 px-4 py-1.5 text-sm font-semibold text-brand-800">
            <Clock className="size-4" />
            Coming soon
          </span>

          <h1 className="mt-6 text-balance text-3xl font-extrabold tracking-tight text-ink-950 sm:text-5xl">
            Your pharmacy, delivered
          </h1>

          <p className="mt-5 text-pretty text-lg leading-relaxed text-ink-600 sm:text-xl">
            {message?.trim() || FALLBACK}
          </p>

          <p className="mt-8 inline-flex items-center gap-2 text-sm text-ink-500">
            <MapPin className="size-4 text-brand-600" />
            Launching across the Greater Toronto Area
          </p>
        </div>
      </section>

      <HowItWorksSection />
      <WhyChooseSection />

      {/* The one thing that is useful before launch: pharmacies can still join. */}
      <section className="border-t border-ink-200 bg-ink-50/60 px-6 py-16">
        <div className="mx-auto flex max-w-[780px] flex-col items-center text-center">
          <SectionLabel className="mb-3">For pharmacies</SectionLabel>
          <h2 className="text-2xl font-bold tracking-tight text-ink-950">Join before we open</h2>
          <p className="mt-3 max-w-[52ch] text-ink-600">
            Pharmacies are onboarding now. Register yours and it will be live to patients on day one.
          </p>
          <Button asChild size="lg" className="mt-7">
            <a href={process.env.NEXT_PUBLIC_PHARMACY_URL ?? "https://pharmacy.getmed.ca"}>Register your pharmacy</a>
          </Button>
        </div>
      </section>

      <footer className="border-t border-ink-200 px-6 py-8">
        <p className="mx-auto max-w-[1200px] text-center text-sm text-ink-500">
          © {new Date().getFullYear()} GetMed Pharmacy Network
        </p>
      </footer>
    </div>
  );
}
