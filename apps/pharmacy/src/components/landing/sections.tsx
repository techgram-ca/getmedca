import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock,
  HeartHandshake,
  LayoutDashboard,
  MessageSquare,
  MonitorX,
  PackageCheck,
  Percent,
  ScrollText,
  ShoppingCart,
  Stethoscope,
  Truck,
  UserMinus,
  Users,
} from "lucide-react";
import { Button, ScrollReveal, SectionLabel } from "@getmed/ui";
import { LOCAL_DEMAND_STAT, MARKET_STATS } from "@/lib/market-stats";

/* ── Market opportunity ─────────────────────────────────────────────── */

export function MarketOpportunity() {
  return (
    <section id="opportunity" className="bg-brand-50 px-6 py-20">
      <div className="mx-auto max-w-[1200px]">
        <ScrollReveal>
          <SectionLabel className="mb-3 text-center">Market reality</SectionLabel>
          <h2 className="text-center text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold tracking-tight text-ink-950">
            The shift to online pharmacy is already happening
          </h2>
          <p className="mx-auto mt-3 max-w-[580px] text-center text-[1.05rem] text-ink-500">
            Patients expect the same digital convenience from their pharmacy that they get everywhere else — and the published data confirms it.
          </p>
        </ScrollReveal>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {MARKET_STATS.map((s, i) => (
            <ScrollReveal key={s.value} delay={i * 100}>
              <div className="h-full rounded-2xl border border-ink-200 bg-white p-7 shadow-sm">
                <div className="mb-3 text-4xl font-extrabold tracking-tight text-brand-600 lg:text-5xl">{s.value}</div>
                <p className="mb-2 text-sm font-semibold leading-snug text-ink-950">{s.label}</p>
                {s.sub ? <p className="text-xs leading-relaxed text-ink-500">{s.sub}</p> : null}
                <p className="mt-4 text-[0.65rem] text-ink-400">
                  Source:{" "}
                  <a href={s.sourceUrl} target="_blank" rel="noreferrer" className="underline hover:text-brand-600">{s.source}</a>
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={300}>
          <div className="mt-6 flex flex-col items-start gap-4 rounded-2xl border border-dashed border-ink-300 bg-white p-6 sm:flex-row sm:items-center">
            <div className="text-4xl font-extrabold text-ink-300">{LOCAL_DEMAND_STAT.value}</div>
            <div>
              <p className="text-sm font-semibold text-ink-950">{LOCAL_DEMAND_STAT.label}</p>
              <p className="mt-0.5 text-xs text-ink-500">{LOCAL_DEMAND_STAT.sub}</p>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

/* ── Problem ────────────────────────────────────────────────────────── */

const PROBLEMS = [
  {
    icon: UserMinus,
    title: "Patients are walking out — digitally",
    body: "Every day, patients discover an online pharmacy that delivers. Once they transfer their prescriptions, they rarely come back. Those are loyal customers lost to platforms that exist entirely online.",
  },
  {
    icon: ShoppingCart,
    title: "No online ordering system",
    body: "When someone searches for online prescription refills near them, an independent pharmacy without a digital ordering channel is invisible — and can't capture patients who won't visit in person.",
  },
  {
    icon: Truck,
    title: "No delivery infrastructure",
    body: "Building your own delivery operation is expensive, complex and slow. Without it you can't serve patients who are housebound, busy, or simply prefer the convenience.",
  },
  {
    icon: MonitorX,
    title: "Limited digital presence",
    body: "Chains and online-only platforms invest heavily in search and app development. Matching that alone, on top of running a pharmacy, isn't realistic.",
  },
];

export function Problem() {
  return (
    <section className="bg-white px-6 py-20">
      <div className="mx-auto max-w-[1200px]">
        <ScrollReveal>
          <span className="mb-3 block text-center text-[0.7rem] font-bold uppercase tracking-[0.12em] text-red-500">The problem</span>
          <h2 className="text-center text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold tracking-tight text-ink-950">
            Independent pharmacies are missing out
          </h2>
          <p className="mx-auto mt-3 max-w-[560px] text-center text-[1.05rem] text-ink-500">
            Without digital tools, independent pharmacies compete with one hand tied behind their back. The gap widens every year.
          </p>
        </ScrollReveal>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2">
          {PROBLEMS.map((p, i) => {
            const Icon = p.icon;
            return (
              <ScrollReveal key={p.title} delay={i * 80}>
                <div className="h-full rounded-2xl border border-red-100 bg-red-50 p-6 transition-shadow hover:shadow-md">
                  <div className="mb-4 flex items-start gap-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-100">
                      <Icon className="size-5 text-red-500" />
                    </div>
                    <h3 className="pt-1 text-[1.05rem] font-bold leading-tight text-ink-950">{p.title}</h3>
                  </div>
                  <p className="text-sm leading-[1.7] text-ink-500">{p.body}</p>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── Solution ───────────────────────────────────────────────────────── */

const SOLUTION_POINTS = [
  "We build and publish your pharmacy profile for you",
  "Online prescription ordering and transfers, with no setup",
  "GetMed manages delivery with our own driver network",
  "One dashboard to accept, track and manage every order",
  "Automatic SMS updates to patients at each step",
  "Built-in consultation requests for your pharmacists",
  "No technical knowledge or staff training needed",
  "You accept or decline every single order",
];

export function Solution() {
  return (
    <section className="bg-brand-600 px-6 py-20">
      <div className="mx-auto max-w-[1200px]">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
          <ScrollReveal>
            <span className="mb-3 block text-[0.7rem] font-bold uppercase tracking-[0.12em] text-white/60">The solution</span>
            <h2 className="text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-tight tracking-tight text-white">
              GetMed brings your pharmacy online
            </h2>
            <p className="mt-4 text-[1.05rem] leading-[1.75] text-white/80">
              We handle the complexity so you can focus on your patients. No expensive setup, no long-term contract, no technical headaches.
            </p>

            <div className="mt-8 space-y-3">
              {SOLUTION_POINTS.map((f) => (
                <div key={f} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-white" />
                  <span className="text-sm leading-relaxed text-white/90">{f}</span>
                </div>
              ))}
            </div>

            <Button asChild size="lg" variant="white" className="mt-10"><Link href="/signup">Get started free <ArrowRight /></Link></Button>
          </ScrollReveal>

          <ScrollReveal delay={150}>
            <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/10 backdrop-blur">
              <div className="grid grid-cols-2 divide-x divide-white/20">
                <div className="p-5">
                  <p className="mb-4 text-xs font-bold uppercase tracking-wider text-white/60">Without GetMed</p>
                  {["Walk-in only", "No online ordering", "No delivery", "Phone-tag with patients", "Patients drift away", "Flat revenue"].map((item) => (
                    <div key={item} className="flex items-center gap-2 border-b border-white/10 py-2 last:border-0">
                      <span className="text-base text-red-300">✕</span>
                      <span className="text-sm text-white/70">{item}</span>
                    </div>
                  ))}
                </div>
                <div className="p-5">
                  <p className="mb-4 text-xs font-bold uppercase tracking-wider text-white">With GetMed</p>
                  {["Online + in-store", "24/7 prescription orders", "Managed delivery", "Automatic SMS updates", "New patients nearby", "Growing order volume"].map((item) => (
                    <div key={item} className="flex items-center gap-2 border-b border-white/10 py-2 last:border-0">
                      <span className="text-base text-emerald-300">✓</span>
                      <span className="text-sm font-medium text-white">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}

/* ── Features ───────────────────────────────────────────────────────── */

const FEATURES = [
  { icon: PackageCheck, title: "Online prescription ordering", desc: "Patients upload a prescription or request a transfer. Every order lands in your dashboard — you verify it and stay in full control." },
  { icon: Truck, title: "GetMed delivery network", desc: "Our drivers handle the last mile to the patient's door, capturing a photo and signature as proof of delivery." },
  { icon: LayoutDashboard, title: "Pharmacy dashboard", desc: "One place to accept orders, mark them ready, track the driver, manage your profile and review what you owe." },
  { icon: Users, title: "Reach patients nearby", desc: "Your pharmacy is listed to patients searching within your delivery area — people who would never have walked through your door." },
  { icon: Stethoscope, title: "Consultation requests", desc: "Patients pick a minor-ailment topic and your pharmacist calls them back. No booking calendar to manage." },
  { icon: MessageSquare, title: "Patient notifications", desc: "Accepted, ready, out for delivery, delivered — patients get an SMS at each step without you lifting a finger." },
];

export function Features() {
  return (
    <>
      <section id="features" className="bg-white px-6 py-20">
        <div className="mx-auto max-w-[1200px]">
          <ScrollReveal>
            <SectionLabel className="mb-3 text-center">Features &amp; benefits</SectionLabel>
            <h2 className="text-center text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold tracking-tight text-ink-950">
              Everything you need to compete online
            </h2>
            <p className="mx-auto mt-3 max-w-[520px] text-center text-[1.05rem] text-ink-500">
              Tools that big chains pay millions to build — available to your pharmacy from day one.
            </p>
          </ScrollReveal>

          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <ScrollReveal key={f.title} delay={i * 70}>
                  <div className="group h-full rounded-2xl border border-ink-200 bg-ink-50 p-6 transition-all hover:border-brand-600/40 hover:shadow-[0_8px_32px_rgba(42,157,143,0.08)]">
                    <div className="relative mb-5 w-fit">
                      <div className="absolute inset-[-5px] rotate-6 rounded-[16px] bg-brand-100 transition-transform duration-300 group-hover:rotate-12" />
                      <div className="relative flex size-12 items-center justify-center rounded-[14px] bg-brand-600">
                        <Icon className="size-6 text-white" />
                      </div>
                    </div>
                    <h3 className="mb-2 text-base font-bold text-ink-950">{f.title}</h3>
                    <p className="text-sm leading-[1.7] text-ink-500">{f.desc}</p>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-brand-50 px-6 py-16">
        <div className="mx-auto max-w-[1200px]">
          <ScrollReveal>
            <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-sm">
              <div className="grid grid-cols-1 lg:grid-cols-2">
                <div className="flex flex-col justify-center bg-gradient-to-br from-brand-600 to-brand-700 p-10">
                  <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-white/20">
                    <Stethoscope className="size-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-extrabold leading-tight tracking-tight text-white">Offer pharmacist consultations</h3>
                  <p className="mt-3 text-sm leading-[1.75] text-white/80">
                    Patients increasingly want to ask a pharmacist a question without leaving home. With GetMed, your licensed pharmacists receive consultation requests and call patients back directly — building relationships that bring prescriptions with them.
                  </p>
                </div>

                <div className="p-10">
                  <p className="mb-5 text-xs font-bold uppercase tracking-widest text-brand-600">How it works for you</p>
                  <div className="space-y-4">
                    {[
                      { title: "Choose the topics you cover", body: "Pick from the minor-ailment list — UTIs, pink eye, allergies, medication reviews and more." },
                      { title: "Requests arrive in your dashboard", body: "Patient name, phone number, the topic and their preferred callback window." },
                      { title: "You call when it suits you", body: "No calendar to manage and no appointment slots to keep free." },
                      { title: "Turn advice into prescriptions", body: "Patients who speak to you are far more likely to fill their next prescription with you." },
                    ].map((b) => (
                      <div key={b.title} className="flex items-start gap-3">
                        <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-100">
                          <div className="size-2 rounded-full bg-brand-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-ink-950">{b.title}</p>
                          <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{b.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}

/* ── Why GetMed + how it works ──────────────────────────────────────── */

const WHY = [
  { icon: BadgeCheck, title: "Free onboarding", desc: "No setup cost. We publish your pharmacy profile at no charge, and you pay nothing until an order is actually delivered." },
  { icon: ScrollText, title: "No contracts", desc: "No fixed term, no cancellation penalty. Pause your listing from your dashboard whenever you need to." },
  { icon: Percent, title: "Zero commission", desc: "We never take a cut of your dispensing revenue. You keep 100% of every sale — we charge one flat delivery fee." },
  { icon: Truck, title: "One simple fee", desc: "A single flat fee per delivered order, set platform-wide and visible in your dashboard. Nothing for orders you decline or that fail." },
  { icon: Clock, title: "Fast approval", desc: "Submit your licence details and we review your application quickly — usually within one business day." },
  { icon: HeartHandshake, title: "Built for independents", desc: "Every feature was designed for independent pharmacies, not corporate chains. We know your constraints and your strengths." },
];

const STEPS = [
  { num: "01", title: "Sign up free", desc: "Create your account and complete a guided seven-step profile. Your progress saves as you type." },
  { num: "02", title: "We verify your licence", desc: "Our team reviews your Ontario College of Pharmacists registration and approves your listing." },
  { num: "03", title: "Start receiving orders", desc: "You go live and patients in your delivery area can send prescriptions straight to you." },
  { num: "04", title: "We handle delivery", desc: "Mark an order ready and our driver collects it from your counter and delivers it to the patient." },
];

export function WhyGetMed() {
  return (
    <>
      <section className="bg-white px-6 py-20">
        <div className="mx-auto max-w-[1200px]">
          <ScrollReveal>
            <SectionLabel className="mb-3 text-center">Why pharmacies join</SectionLabel>
            <h2 className="text-center text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold tracking-tight text-ink-950">Why pharmacies choose GetMed</h2>
            <p className="mx-auto mt-3 max-w-[520px] text-center text-[1.05rem] text-ink-500">
              We built GetMed to remove every barrier that has stopped independent pharmacies from going digital.
            </p>
          </ScrollReveal>

          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {WHY.map((w, i) => {
              const Icon = w.icon;
              return (
                <ScrollReveal key={w.title} delay={i * 70}>
                  <div className="h-full rounded-2xl border-2 border-ink-200 p-6 transition-all hover:border-brand-600 hover:bg-ink-50">
                    <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-brand-100">
                      <Icon className="size-5 text-brand-600" />
                    </div>
                    <h3 className="mb-2 text-base font-bold text-ink-950">{w.title}</h3>
                    <p className="text-sm leading-[1.7] text-ink-500">{w.desc}</p>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-brand-50 px-6 py-20">
        <div className="mx-auto max-w-[1200px]">
          <ScrollReveal>
            <SectionLabel className="mb-3 text-center">Simple process</SectionLabel>
            <h2 className="text-center text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold tracking-tight text-ink-950">How it works</h2>
            <p className="mx-auto mt-3 max-w-[480px] text-center text-[1.05rem] text-ink-500">
              From signup to your first online order in four simple steps.
            </p>
          </ScrollReveal>

          <div className="relative mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="absolute left-[12.5%] right-[12.5%] top-10 z-0 hidden h-px bg-ink-200 lg:block" />
            {STEPS.map((s, i) => (
              <ScrollReveal key={s.num} delay={i * 100}>
                <div className="relative z-10 h-full rounded-2xl border border-ink-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex size-10 items-center justify-center rounded-full bg-brand-600 text-xs font-extrabold text-white shadow-[0_4px_12px_rgba(42,157,143,0.3)]">
                    {s.num}
                  </div>
                  <h3 className="mb-2 text-base font-bold text-ink-950">{s.title}</h3>
                  <p className="text-sm leading-[1.7] text-ink-500">{s.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal delay={400}>
            <div className="mt-10 text-center">
              <Button asChild size="lg"><Link href="/signup">Start step 1 — sign up free <ArrowRight /></Link></Button>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}

/* ── Final CTA + footer ─────────────────────────────────────────────── */

const TRUST = ["No upfront cost", "No contract", "Cancel anytime", "You approve every order"];

export function FinalCta() {
  return (
    <>
      <section className="bg-brand-600 px-6 py-24 text-center">
        <div className="mx-auto max-w-[720px]">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/20 px-3.5 py-1.5 text-xs font-semibold text-white">
            <span className="size-2 animate-pulse rounded-full bg-white" />
            Now onboarding Ontario pharmacies
          </div>

          <h2 className="text-[clamp(1.9rem,4.5vw,3rem)] font-extrabold leading-tight tracking-tight text-white">
            Start growing your pharmacy today
          </h2>

          <p className="mx-auto mt-4 max-w-[500px] text-[1.05rem] leading-[1.75] text-white/80">
            The pharmacies that go digital now will keep the patients the chains haven&#39;t reached yet. GetMed is the fastest way to get there.
          </p>

          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" variant="white"><Link href="/signup">Create your free account <ArrowRight /></Link></Button>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-white/40 px-9 py-4 text-base font-semibold text-white no-underline transition-colors hover:border-white/80"
            >
              See how it works
            </a>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2">
            {TRUST.map((t) => (
              <span key={t} className="flex items-center gap-1.5 text-sm text-white/80">
                <span className="text-white">✓</span>
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-ink-200 bg-brand-50 px-6 py-10">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-5">
          <Link href="/" className="no-underline">
            <span className="inline-flex items-center gap-2.5 text-[1.2rem] font-extrabold tracking-tight text-ink-950">
              <span className="flex size-9 items-center justify-center rounded-[10px] bg-brand-600">
                <HeartIcon />
              </span>
              Get<span className="text-brand-600">Med</span>
            </span>
          </Link>

          <ul className="flex list-none flex-wrap gap-6">
            <li><a href={process.env.NEXT_PUBLIC_PATIENT_URL ?? "https://getmed.ca"} className="text-sm text-ink-500 no-underline hover:text-ink-950">For patients</a></li>
            <li><Link href="/login" className="text-sm text-ink-500 no-underline hover:text-ink-950">Sign in</Link></li>
            <li><Link href="/signup" className="text-sm text-ink-500 no-underline hover:text-ink-950">Sign up</Link></li>
          </ul>

          <p className="flex items-center gap-1 text-xs text-ink-500">
            Made with <span className="text-brand-600">♥</span> by GetMed © {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      <path d="M3.22 13H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27" />
    </svg>
  );
}
