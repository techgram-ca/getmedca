import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@getmed/ui";
import { HomeSearch } from "@/components/home-search";

export const metadata: Metadata = { title: "How it works" };

const SECTIONS = [
  {
    title: "1. Find a pharmacy near you",
    body: "Enter your delivery address. We look up licensed independent pharmacies within the GetMed delivery radius and sort them by real driving distance, so the nearest option is always first. Each pharmacy page shows hours, pharmacists, services, accepted insurance, and delivery details.",
  },
  {
    title: "2. Place your order",
    body: "Choose New prescription (upload a photo or PDF) or Transfer (tell us where your prescription is now). Add your delivery address, optional insurance and health card details, and any notes for the pharmacist. We verify your mobile number with a one-time code — no account or password to remember.",
  },
  {
    title: "3. The pharmacy reviews it",
    body: "Your chosen pharmacy is notified instantly and commits to responding within 30 minutes during business hours. If they can't fill it, or don't respond in time, our support team personally contacts you to sort out next steps.",
  },
  {
    title: "4. Delivery to your door",
    body: "Once your order is ready, a GetMed driver picks it up from the pharmacy. You'll receive a text when it's on its way. At the door, the driver captures a signature and photo as proof of delivery. Payment for the medication is settled with the pharmacy directly.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">How GetMed works</h1>
      <p className="mt-3 text-lg text-ink-600">From prescription to doorstep, here's exactly what happens.</p>
      <ol className="mt-10 space-y-8">
        {SECTIONS.map((s) => (
          <li key={s.title} className="surface p-6">
            <h2 className="text-lg font-semibold">{s.title}</h2>
            <p className="mt-2 leading-relaxed text-ink-600">{s.body}</p>
          </li>
        ))}
      </ol>
      <div className="mt-12 rounded-2xl bg-brand-50 p-6">
        <h2 className="text-lg font-semibold">Ready to start?</h2>
        <HomeSearch className="mt-4" size="md" />
        <p className="mt-4 text-sm text-ink-600">
          Prefer to talk to someone first? <Link href="/consultation" className="font-medium text-brand-700 underline-offset-2 hover:underline">Request a pharmacist consultation.</Link>
        </p>
      </div>
      <div className="mt-8 text-center">
        <Button asChild variant="link"><Link href="/faq">Read the FAQ</Link></Button>
      </div>
    </div>
  );
}
