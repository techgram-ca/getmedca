import Link from "next/link";
import { ArrowRight, BadgeDollarSign, Check, ClipboardCheck, Palette, Quote, Rocket, ShieldCheck, Truck } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, Button, Logo } from "@getmed/ui";
import { MARKET_STATS } from "@/lib/market-stats";

const WHY = [
  { icon: BadgeDollarSign, title: "Low-cost entry", body: "No subscription, no commission on your dispensing. You pay one flat delivery fee per completed order — nothing when an order isn't delivered." },
  { icon: Palette, title: "Keep your own brand", body: "Your name, logo, pharmacists and services front and centre. Patients choose you, not a marketplace." },
  { icon: ClipboardCheck, title: "You stay in control", body: "Accept or reject every order. Decide which consultations you offer. Pause any time." },
  { icon: Rocket, title: "Set up in an afternoon", body: "Seven guided steps with a live preview of your public page. Go live once our team verifies your licence." },
];

const STEPS = [
  { n: "1", title: "Create your profile", body: "Business details, licence, pharmacists, services and hours — with autosave and a live preview." },
  { n: "2", title: "Get verified", body: "Our team reviews your Ontario College of Pharmacists licence and approves your listing." },
  { n: "3", title: "Receive orders", body: "Patients near you send new prescriptions and transfers. You get a sound alert and 30 minutes to respond." },
  { n: "4", title: "We deliver", body: "Mark the order ready; a GetMed driver picks it up and captures proof of delivery at the door." },
];

const FAQ = [
  { q: "What does GetMed cost?", a: "A flat delivery fee per delivered order, set platform-wide and shown in your dashboard. You're invoiced monthly for the number of orders delivered that month. No subscription, no percentage of your sales, and nothing charged for orders that are rejected, cancelled or not delivered." },
  { q: "Is there a contract?", a: "No fixed term. You can set your pharmacy to inactive at any time from your dashboard and reactivate whenever you like." },
  { q: "How do patients pay for their medication?", a: "Directly with you, exactly as they do today — by phone before dispatch or at the door, depending on your policy. GetMed never handles patient payments." },
  { q: "Who delivers?", a: "GetMed drivers. Once you mark an order ready, our team assigns a driver who picks up from your counter and captures a photo and signature at delivery. Failed deliveries come back to you through our support team." },
  { q: "What about patient privacy?", a: "Prescriptions and health documents are stored encrypted in Canada and only shared with you. GetMed's support team never sees prescription, insurance or health card details." },
];

export default function LandingPage() {
  return (
    <div>
      <header className="sticky top-0 z-40 border-b border-ink-200/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm"><Link href="/login">Sign in</Link></Button>
            <Button asChild size="sm"><Link href="/signup">Get started</Link></Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-ink-950 text-white">
        <div className="pointer-events-none absolute -right-40 -top-40 size-[30rem] rounded-full bg-brand-600/30 blur-3xl" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="text-sm font-medium text-brand-300">For independent Ontario pharmacies</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            The patients around your pharmacy are already ordering delivery. <span className="text-brand-300">Make sure it's from you.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-ink-300">
            GetMed puts your pharmacy in front of nearby patients looking for prescription delivery, transfers and pharmacist consultations — and handles the driving.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="accent"><Link href="/signup">Create your pharmacy profile <ArrowRight /></Link></Button>
            <Button asChild size="lg" variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10"><a href="#how">See how it works</a></Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">The market is moving online — with or without you</h2>
        <p className="mt-2 max-w-2xl text-ink-600">Chains have spent years building delivery apps. Independent pharmacies deliver better care, but patients can't find them online. That's the gap GetMed closes.</p>
        <dl className="mt-8 grid gap-4 sm:grid-cols-2">
          {MARKET_STATS.map((s) => (
            <div key={s.label} className="surface p-6">
              <dt className="text-3xl font-semibold text-brand-700">{s.value}</dt>
              <dd className="mt-1 text-ink-700">{s.label}</dd>
              <p className="mt-3 text-xs text-ink-400">
                Source:{" "}
                {s.illustrative ? <span>{s.source}</span> : <a href={s.sourceUrl} target="_blank" rel="noreferrer" className="underline hover:text-brand-700">{s.source}</a>}
              </p>
            </div>
          ))}
        </dl>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Why pharmacies choose GetMed</h2>
          <ul className="mt-8 grid gap-6 md:grid-cols-2">
            {WHY.map((w) => (
              <li key={w.title} className="flex gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><w.icon className="size-5" /></span>
                <div>
                  <h3 className="font-semibold">{w.title}</h3>
                  <p className="mt-1 text-sm text-ink-600">{w.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">What pharmacists say</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="surface flex flex-col p-6">
              <Quote className="size-6 text-brand-300" />
              <p className="mt-3 flex-1 text-sm italic text-ink-400">Testimonial coming soon — we're onboarding our first pharmacies now.</p>
              <div className="mt-4 h-3 w-24 rounded bg-ink-100" aria-hidden />
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="bg-brand-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">How it works</h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-4">
            {STEPS.map((s) => (
              <li key={s.n} className="surface p-5">
                <span className="text-sm font-semibold text-brand-600">Step {s.n}</span>
                <h3 className="mt-1 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-ink-600">{s.body}</p>
              </li>
            ))}
          </ol>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-700">
            <li className="inline-flex items-center gap-1.5"><ShieldCheck className="size-4 text-brand-600" /> Licence-verified listings</li>
            <li className="inline-flex items-center gap-1.5"><Truck className="size-4 text-brand-600" /> Proof of delivery on every order</li>
            <li className="inline-flex items-center gap-1.5"><Check className="size-4 text-brand-600" /> Cancel any time</li>
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Common questions</h2>
        <Accordion type="multiple" className="surface mt-6 px-5">
          {FAQ.map((f) => (
            <AccordionItem key={f.q} value={f.q}>
              <AccordionTrigger>{f.q}</AccordionTrigger>
              <AccordionContent>{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section className="bg-ink-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight">Be the pharmacy patients find first.</h2>
          <p className="mx-auto mt-3 max-w-xl text-ink-300">Setup takes about 30 minutes. There's nothing to pay until your first order is delivered.</p>
          <Button asChild size="lg" variant="accent" className="mt-8"><Link href="/signup">Create your pharmacy profile <ArrowRight /></Link></Button>
        </div>
      </section>
      <footer className="border-t border-ink-200 bg-white py-6 text-center text-xs text-ink-400">© {new Date().getFullYear()} GetMed · <a className="underline" href={process.env.NEXT_PUBLIC_PATIENT_URL ?? "https://getmed.ca"}>Patient site</a></footer>
    </div>
  );
}
