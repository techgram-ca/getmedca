import Link from "next/link";
import { ArrowRight, Clock, Lock, MapPin, MessageCircle, Package, ShieldCheck, Truck } from "lucide-react";
import { Button, Card, CardContent } from "@getmed/ui";
import { HomeSearch } from "@/components/home-search";

const STEPS = [
  { icon: MapPin, title: "Enter your address", body: "We show independent pharmacies that can deliver to you, sorted by real driving distance." },
  { icon: Package, title: "Send your prescription", body: "Upload a new prescription or transfer from your current pharmacy in under two minutes." },
  { icon: Truck, title: "Get it delivered", body: "The pharmacy fills your order and a GetMed driver brings it to your door. You'll get text updates along the way." },
];

const PILLARS = [
  { icon: ShieldCheck, title: "Licensed Ontario pharmacies", body: "Every pharmacy is verified against its Ontario College of Pharmacists licence before it goes live." },
  { icon: Lock, title: "Private by design", body: "Your prescription and health documents are encrypted, stored in Canada, and only visible to your chosen pharmacy." },
  { icon: Clock, title: "Fast responses", body: "Pharmacies commit to responding to every order within 30 minutes during business hours." },
  { icon: MessageCircle, title: "Talk to a pharmacist", body: "Request a call-back about minor ailments, medication reviews, and more — no appointment needed." },
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white">
        <div className="pointer-events-none absolute -right-32 -top-32 size-[28rem] rounded-full bg-brand-100/60 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -left-24 top-40 size-72 rounded-full bg-accent-100/50 blur-3xl" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-medium text-brand-800">
              <span className="size-1.5 rounded-full bg-brand-500 animate-pulse-ring" /> Now delivering across Ontario
            </span>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-ink-950 sm:text-5xl lg:text-6xl">
              Your prescription, <span className="text-brand-600">delivered</span> by a pharmacy near you.
            </h1>
            <p className="mt-5 text-lg text-ink-600">
              Skip the line. Send a new prescription or transfer your existing one to a trusted local pharmacy and have it delivered to your door.
            </p>
          </div>
          <div className="mt-8 max-w-3xl rounded-2xl border border-ink-200 bg-white p-3 shadow-card">
            <HomeSearch />
            <p className="mt-2 px-1 text-xs text-ink-500">No account needed. We'll verify your phone number when you place an order.</p>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-600">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-4 text-brand-600" /> Licensed pharmacies only</span>
            <span className="inline-flex items-center gap-1.5"><Lock className="size-4 text-brand-600" /> Data stored in Canada</span>
            <span className="inline-flex items-center gap-1.5"><Clock className="size-4 text-brand-600" /> 30-minute pharmacy response</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="max-w-xl">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Three steps, no waiting room</h2>
          <p className="mt-2 text-ink-600">Everything happens on your phone. The pharmacy handles your prescription exactly as they would in store.</p>
        </div>
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="surface p-6 animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><s.icon className="size-5" /></span>
                <span className="text-sm font-semibold text-ink-300">0{i + 1}</span>
              </div>
              <h3 className="mt-4 font-semibold text-ink-900">{s.title}</h3>
              <p className="mt-1.5 text-sm text-ink-600">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-ink-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:items-center">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Built for trust with your health information</h2>
              <p className="mt-3 text-ink-300">
                GetMed is healthcare infrastructure, not a marketplace for your data. We connect you with a pharmacy and get out of the way.
              </p>
              <Button asChild variant="accent" className="mt-6">
                <Link href="/how-it-works">See how it works <ArrowRight /></Link>
              </Button>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2">
              {PILLARS.map((p) => (
                <li key={p.title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p.icon className="size-5 text-brand-300" />
                  <h3 className="mt-3 font-semibold">{p.title}</h3>
                  <p className="mt-1 text-sm text-ink-300">{p.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <Card className="overflow-hidden">
          <CardContent className="grid gap-6 p-8 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="text-xl font-semibold">Have a question for a pharmacist?</h2>
              <p className="mt-1 text-ink-600">Pick a topic, choose a pharmacy near you, and a pharmacist will call you back. No appointment, no fee to request.</p>
            </div>
            <Button asChild size="lg" variant="secondary">
              <Link href="/consultation">Browse consultation topics <ArrowRight /></Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
