import type { Metadata } from "next";
import Link from "next/link";
import { HeartPulse, MapPin, ShieldCheck, Stethoscope, Truck, Users, Zap } from "lucide-react";
import { Button, ImageWithFallback } from "@getmed/ui";

export const metadata: Metadata = {
  title: "About GetMed",
  description: "Learn about GetMed — our mission to make pharmacy services more accessible, and the values behind the platform.",
};

const VALUES = [
  { icon: ShieldCheck, title: "Trust & Safety", desc: "Every pharmacy on GetMed is licensed and verified against its Ontario College of Pharmacists registration before it goes live." },
  { icon: Zap, title: "Speed & Convenience", desc: "From search to delivery in a few taps. Pharmacies commit to responding to every order within 30 minutes during business hours." },
  { icon: HeartPulse, title: "Patient-First Care", desc: "Clear information, no hidden fees, and access to real pharmacist advice. You never pay GetMed anything." },
  { icon: Users, title: "Community Pharmacies", desc: "We partner with local, independent pharmacies — not big-box chains. Supporting community pharmacists supports your neighbourhood." },
];

const HOW = [
  { icon: MapPin, step: "01", title: "Find a nearby pharmacy", desc: "Enter your address to instantly see licensed pharmacies that deliver to you, sorted by real driving distance." },
  { icon: Stethoscope, step: "02", title: "Order or consult", desc: "Submit a new prescription, transfer from another pharmacy, or request a call back from a pharmacist." },
  { icon: Truck, step: "03", title: "Receive your medications", desc: "Your pharmacy confirms the order and a GetMed driver delivers it to your door, with proof of delivery." },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-ink-50">
      <section className="mx-auto max-w-[1200px] px-6 pb-16 pt-14">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-brand-100 px-3.5 py-1.5 text-xs font-semibold text-brand-600">
              <span className="size-2 rounded-full bg-brand-600" />
              Our Story
            </div>
            <h1 className="text-[clamp(2rem,5vw,3.2rem)] font-extrabold leading-[1.15] tracking-tight text-ink-950">
              Making Pharmacy Care <span className="text-brand-600">Accessible</span> for Everyone
            </h1>
            <p className="mt-5 text-[1.05rem] leading-[1.7] text-ink-500">
              GetMed was founded on a simple belief: getting your medications and speaking to a pharmacist should be easy, affordable, and stress-free — no matter where you live.
            </p>
            <p className="mt-4 text-[1.05rem] leading-[1.7] text-ink-500">
              We connect patients with trusted, licensed community pharmacies so they can order prescriptions, arrange home delivery, and consult a pharmacist — all from one place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg"><Link href="/#search">Find a Pharmacy</Link></Button>
              <Button asChild size="lg" variant="outline"><Link href="/consultation">Consult a Pharmacist</Link></Button>
            </div>
          </div>

          <div className="hero-plate hidden lg:block">
            <ImageWithFallback src="/images/about.png" alt="The GetMed team" label="Upload /images/about.png" wrapperClassName="relative aspect-[4/3] w-full rounded-2xl shadow-hero" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-6 py-20">
        <div className="mx-auto max-w-[680px] text-center">
          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-brand-600">Our Mission</p>
          <h2 className="text-3xl font-extrabold leading-snug text-ink-950">Bridging the gap between patients and pharmacies</h2>
          <p className="mt-5 text-[1.05rem] leading-[1.7] text-ink-500">
            Many people struggle to access timely pharmacy services — whether due to distance, mobility, or simply a lack of time. GetMed exists to remove those barriers, while keeping independent pharmacies at the centre of care.
          </p>
        </div>
      </section>

      <section className="border-y border-ink-200 bg-white py-20">
        <div className="mx-auto max-w-[1200px] px-6">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-brand-600">What We Stand For</p>
          <h2 className="mb-12 text-center text-3xl font-extrabold text-ink-950">Our Values</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex flex-col gap-4 rounded-2xl border border-ink-200 bg-ink-50 p-6">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-100">
                  <Icon className="size-5 text-brand-600" />
                </div>
                <div>
                  <h3 className="mb-1 text-base font-extrabold text-ink-950">{title}</h3>
                  <p className="text-sm leading-relaxed text-ink-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-6 py-20">
        <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-brand-600">Simple by Design</p>
        <h2 className="mb-12 text-center text-3xl font-extrabold text-ink-950">How GetMed Works</h2>
        <div className="grid gap-8 md:grid-cols-3">
          {HOW.map(({ icon: Icon, step, title, desc }) => (
            <div key={step} className="flex flex-col gap-5">
              <div className="flex items-center gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-100">
                  <Icon className="size-6 text-brand-600" />
                </div>
                <span className="text-3xl font-extrabold text-brand-100">{step}</span>
              </div>
              <div>
                <h3 className="mb-2 text-lg font-extrabold text-ink-950">{title}</h3>
                <p className="text-sm leading-relaxed text-ink-500">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-brand-600 py-16">
        <div className="mx-auto max-w-[700px] px-6 text-center">
          <h2 className="mb-4 text-3xl font-extrabold text-white">Ready to get started?</h2>
          <p className="mb-8 text-[1.05rem] leading-relaxed text-white/80">Find a pharmacy near you and place your first order in minutes.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" variant="white"><Link href="/#search">Find a Pharmacy</Link></Button>
            <Button asChild size="lg" variant="outline" className="border-white/40 bg-transparent text-white hover:border-white hover:text-white"><Link href="/faq">View FAQs</Link></Button>
          </div>
        </div>
      </section>
    </div>
  );
}
