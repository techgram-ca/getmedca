import type { Metadata } from "next";
import Link from "next/link";
import { Button, SectionLabel } from "@getmed/ui";
import { HomeSearchInline } from "@/components/home-search-inline";

export const metadata: Metadata = { title: "How it works" };

const SECTIONS = [
  {
    n: "01",
    title: "Find a pharmacy near you",
    body: "Enter your delivery address. We look up licensed independent pharmacies within the GetMed delivery radius and sort them by real driving distance, so the nearest option is always first. Each pharmacy page shows hours, pharmacists, services, accepted insurance, and delivery details.",
  },
  {
    n: "02",
    title: "Place your order",
    body: "Choose New prescription (upload a photo or PDF) or Transfer (tell us where your prescription is now). Add your delivery address, optional insurance and health card details, and any notes for the pharmacist. We verify your mobile number with a one-time code — no account or password to remember.",
  },
  {
    n: "03",
    title: "The pharmacy reviews it",
    body: "Your chosen pharmacy is notified instantly and commits to responding within 30 minutes during business hours. If they can't fill it, or don't respond in time, our support team personally contacts you to sort out next steps.",
  },
  {
    n: "04",
    title: "Delivery to your door",
    body: "Once your order is ready, a GetMed driver picks it up from the pharmacy. You'll receive a text when it's on its way. At the door, the driver captures a signature and photo as proof of delivery. Payment for the medication is settled with the pharmacy directly.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <SectionLabel className="mb-3">Simple Process</SectionLabel>
      <h1 className="text-[clamp(2rem,5vw,3rem)] font-extrabold tracking-tight text-ink-950">How GetMed works</h1>
      <p className="mt-3 text-lg text-ink-500">From prescription to doorstep, here&#39;s exactly what happens.</p>

      <ol className="mt-10 space-y-6">
        {SECTIONS.map((s) => (
          <li key={s.n} className="surface rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-extrabold text-white">{s.n}</span>
              <div>
                <h2 className="text-lg font-bold text-ink-950">{s.title}</h2>
                <p className="mt-2 leading-relaxed text-ink-500">{s.body}</p>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-12 rounded-2xl bg-brand-50 p-6">
        <h2 className="text-lg font-bold text-ink-950">Ready to start?</h2>
        <HomeSearchInline className="mt-4" />
        <p className="mt-4 text-sm text-ink-500">
          Prefer to talk to someone first?{" "}
          <Link href="/consultation" className="font-semibold text-brand-600 underline-offset-2 hover:underline">Request a pharmacist consultation.</Link>
        </p>
      </div>

      <div className="mt-8 text-center">
        <Button asChild variant="link"><Link href="/faq">Read the FAQ</Link></Button>
      </div>
    </div>
  );
}
