import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Accessibility,
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  Clock,
  FileText,
  MapPin,
  Phone,
  ShieldCheck,
  Stethoscope,
  Tag,
  Truck,
  Users,
} from "lucide-react";
import { distanceToPharmacy } from "@getmed/core/geo";
import { DAY_KEYS, DAY_LABELS, formatTime, type WeeklyHours } from "@getmed/core/hours";
import { formatCurrency, formatDistance, formatDuration } from "@getmed/core/format";
import { Avatar, Badge, Button, ImageWithFallback, ScrollReveal, cn } from "@getmed/ui";
import { PharmacyFooter, PharmacyHeader, StickyOrderBar, type ChromePharmacy } from "@/components/pharmacy/pharmacy-chrome";
import { getPublicPharmacy } from "@/lib/pharmacy";

export const dynamic = "force-dynamic";

type Params = { slug: string };
type Search = { address?: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPublicPharmacy(slug);
  if (!p) return { title: "Pharmacy" };
  const where = [p.city, p.province].filter(Boolean).join(", ");
  return {
    title: { absolute: `${p.name}${where ? ` — ${where}` : ""}` },
    description:
      p.tagline ??
      `${p.name}${where ? ` in ${where}` : ""}. Order prescriptions online, transfer from another pharmacy, and get free delivery to your door.`,
  };
}

export default async function PharmacyPage({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<Search> }) {
  const { slug } = await params;
  const { address } = await searchParams;
  const p = await getPublicPharmacy(slug);
  if (!p) notFound();

  const distance =
    address && p.lat != null && p.lng != null ? await distanceToPharmacy(address, { lat: p.lat, lng: p.lng }).catch(() => null) : null;

  const hours = (p.hours ?? {}) as WeeklyHours;
  const main = p.pharmacists.find((s) => s.is_main) ?? p.pharmacists[0];
  const others = p.pharmacists.filter((s) => s.id !== main?.id);
  const fullAddress = [p.address_line, p.city, p.province, p.postal_code].filter(Boolean).join(", ");
  const orderHref = `/order/new?pharmacyId=${p.id}${address ? `&address=${encodeURIComponent(address)}` : ""}`;
  const consultHref = `/consultation/request?pharmacyId=${p.id}`;

  const chrome: ChromePharmacy = {
    id: p.id,
    slug: p.slug ?? p.id,
    name: p.name ?? "Our pharmacy",
    logoUrl: p.logoUrl,
    phone: p.phone,
    offersConsultation: p.offers_consultation,
  };

  const navLinks = [
    { href: "#about", label: "About us" },
    ...(p.pharmacists.length ? [{ href: "#team", label: "Our team" }] : []),
    ...(p.services.length ? [{ href: "#services", label: "Services" }] : []),
    { href: "#visit", label: "Visit us" },
  ];

  const highlights = [
    { icon: ShieldCheck, value: "Licensed", label: `Registered with the ${p.province === "ON" ? "Ontario College of Pharmacists" : "provincial college of pharmacists"}` },
    p.offers_delivery
      ? { icon: Truck, value: p.estimated_delivery_time ?? "Same day", label: p.delivery_radius_km ? `Free delivery within ${p.delivery_radius_km} km` : "Free delivery to your door" }
      : null,
    p.pharmacists.length ? { icon: Users, value: `${p.pharmacists.length} pharmacist${p.pharmacists.length > 1 ? "s" : ""}`, label: "On staff to answer your questions" } : null,
    p.offers_consultation ? { icon: Stethoscope, value: "Free advice", label: "Speak to a pharmacist without an appointment" } : null,
  ].filter(Boolean) as { icon: typeof ShieldCheck; value: string; label: string }[];

  return (
    <div className="flex min-h-screen flex-col bg-ink-50">
      <PharmacyHeader pharmacy={chrome} links={navLinks} />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="border-b border-ink-200 bg-gradient-to-b from-brand-50 to-ink-50">
        <div className="mx-auto max-w-[1200px] px-6 py-14 lg:py-20">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-brand-100 px-3.5 py-1.5 text-xs font-semibold text-brand-600">
                <span className={cn("size-2 rounded-full", p.openNow.open ? "bg-brand-600 pulse-dot" : "bg-ink-400")} />
                {p.openNow.open ? `Open now · ${p.openNow.label.replace(/^Open until/, "until")}` : p.openNow.label}
              </div>

              <h1 className="text-[clamp(2.2rem,5vw,3.4rem)] font-extrabold leading-[1.12] tracking-tight text-ink-950">{p.name}</h1>

              <p className="mt-4 max-w-[520px] text-[1.05rem] leading-[1.7] text-ink-500">
                {p.tagline ?? "Personalised care for you and your family, right in your neighbourhood. Order your prescription online and we'll bring it to your door."}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg"><Link href={orderHref}><FileText /> Order prescription</Link></Button>
                {p.offers_consultation ? (
                  <Button asChild size="lg" variant="outline"><Link href={consultHref}><Stethoscope /> Ask a pharmacist</Link></Button>
                ) : null}
              </div>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <div className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-brand-600" />
                  <p className="text-sm leading-snug text-ink-500">{fullAddress}</p>
                </div>
                {p.phone ? (
                  <a href={`tel:${p.phone}`} className="flex items-center gap-2.5 text-sm text-ink-500 no-underline transition-colors hover:text-brand-700">
                    <Phone className="size-4 shrink-0 text-brand-600" />
                    {p.phone}
                  </a>
                ) : null}
              </div>

              {distance ? (
                <p className="mt-3 text-sm text-ink-500">
                  <Truck className="mr-1.5 inline size-4 text-brand-600" />
                  {formatDistance(distance.distanceM)} · {formatDuration(distance.durationS)} drive from your address
                </p>
              ) : null}
            </div>

            <div className="hero-plate">
              <ImageWithFallback
                src={p.coverUrl}
                alt={p.name ?? "Our pharmacy"}
                label="Add a cover photo from your dashboard"
                wrapperClassName="relative h-[300px] w-full rounded-2xl shadow-hero md:h-[420px]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Highlights ───────────────────────────────────────── */}
      {highlights.length ? (
        <section className="border-b border-ink-200 bg-white">
          <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-px bg-ink-200 px-0 sm:grid-cols-2 lg:grid-cols-4">
            {highlights.map(({ icon: Icon, value, label }) => (
              <div key={value} className="flex items-start gap-3.5 bg-white px-6 py-7">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-100">
                  <Icon className="size-5 text-brand-600" />
                </div>
                <div>
                  <p className="font-extrabold text-ink-950">{value}</p>
                  <p className="mt-0.5 text-sm leading-snug text-ink-500">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* ── About + services ─────────────────────────────────── */}
      <section id="about" className="scroll-mt-20 bg-white py-20">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="grid items-start gap-12 lg:grid-cols-2">
            <ScrollReveal>
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-brand-600">About us</p>
              <h2 className="text-3xl font-extrabold tracking-tight text-ink-950">
                {p.city ? `Caring for ${p.city}, one patient at a time` : "Caring for our community, one patient at a time"}
              </h2>
              <p className="mt-4 leading-relaxed text-ink-500">
                {p.bio ??
                  "We are a trusted community pharmacy committed to providing personalised, compassionate care to every patient who walks through our doors. From filling prescriptions quickly and accurately to offering expert advice, our team is dedicated to your health and wellbeing."}
              </p>

              <div className="mt-7">
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-500">What we offer</p>
                <div className="flex flex-wrap gap-2.5">
                  {p.offers_delivery ? <ServiceChip icon={Truck} label="Home delivery" tone="purple" /> : null}
                  {p.offers_transfer ? <ServiceChip icon={ArrowRight} label="Prescription transfers" tone="blue" /> : null}
                  {p.offers_consultation ? <ServiceChip icon={Stethoscope} label="Pharmacist consultations" tone="teal" /> : null}
                  <ServiceChip icon={FileText} label="Online prescription orders" tone="teal" />
                </div>
              </div>

              {p.accepted_insurance.length ? (
                <div className="mt-7">
                  <p className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-500">Insurance we accept</p>
                  <div className="flex flex-wrap gap-1.5">
                    {p.accepted_insurance.map((i) => <Badge key={i} tone="neutral">{i}</Badge>)}
                  </div>
                </div>
              ) : null}
            </ScrollReveal>

            <ScrollReveal delay={120}>
              <div className="rounded-2xl border border-ink-200 bg-ink-50 p-7">
                <p className="mb-5 text-xs font-bold uppercase tracking-widest text-brand-600">How ordering works</p>
                <ol className="space-y-5">
                  {[
                    { n: "1", t: "Send us your prescription", d: "Upload a photo or PDF, or ask us to transfer it from your current pharmacy." },
                    { n: "2", t: "We review and prepare it", d: "Our pharmacist checks your order and calls you if anything needs clarifying." },
                    { n: "3", t: "We deliver to your door", d: "A driver brings your medication to you and captures a signature on delivery." },
                  ].map((s) => (
                    <li key={s.n} className="flex gap-4">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-extrabold text-white">{s.n}</span>
                      <div>
                        <p className="font-bold text-ink-950">{s.t}</p>
                        <p className="mt-0.5 text-sm leading-relaxed text-ink-500">{s.d}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <Button asChild className="mt-7 w-full"><Link href={orderHref}>Start your order <ArrowRight /></Link></Button>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── Team ─────────────────────────────────────────────── */}
      {main ? (
        <section id="team" className="scroll-mt-20 border-y border-ink-200 bg-brand-50 py-20">
          <div className="mx-auto max-w-[1200px] px-6">
            <ScrollReveal>
              <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-brand-600">Our team</p>
              <h2 className="text-center text-3xl font-extrabold tracking-tight text-ink-950">Meet your pharmacists</h2>
              <p className="mx-auto mt-3 max-w-[520px] text-center text-ink-500">
                Real people you can call, not a call centre. We know our patients by name.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={100}>
              <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-ink-200 bg-white p-8">
                <div className="flex flex-col gap-6 sm:flex-row">
                  <Avatar src={main.photoUrl} name={main.name} size={112} className="shrink-0 rounded-2xl" />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xl font-extrabold text-ink-950">{main.name}</p>
                      <Badge tone="brand"><BadgeCheck className="size-3" /> Pharmacist in charge</Badge>
                    </div>
                    <p className="mt-1 text-sm text-ink-500">
                      {[main.credentials, main.years_experience != null ? `${main.years_experience} years of experience` : null].filter(Boolean).join(" · ")}
                    </p>
                    {main.bio ? <p className="mt-3 leading-relaxed text-ink-600">{main.bio}</p> : null}
                    {main.languages.length ? <p className="mt-3 text-sm text-ink-500">Speaks {main.languages.join(", ")}</p> : null}
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {others.length ? (
              <div className="mx-auto mt-6 grid max-w-3xl gap-4 sm:grid-cols-2">
                {others.map((s, i) => (
                  <ScrollReveal key={s.id} delay={140 + i * 60}>
                    <div className="flex items-center gap-4 rounded-2xl border border-ink-200 bg-white p-4">
                      <Avatar src={s.photoUrl} name={s.name} size={52} className="rounded-xl" />
                      <div className="min-w-0">
                        <p className="truncate font-bold text-ink-950">{s.name}</p>
                        <p className="truncate text-sm text-ink-500">{s.credentials ?? "Pharmacist"}</p>
                      </div>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* ── Services & prices ────────────────────────────────── */}
      {p.services.length ? (
        <section id="services" className="scroll-mt-20 bg-white py-20">
          <div className="mx-auto max-w-[900px] px-6">
            <ScrollReveal>
              <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-brand-600">Pricing</p>
              <h2 className="text-center text-3xl font-extrabold tracking-tight text-ink-950">Our services &amp; prices</h2>
              <p className="mt-3 text-center text-ink-500">Transparent pricing for the services we offer. Call us to book any of these.</p>
            </ScrollReveal>

            <ScrollReveal delay={100}>
              <div className="mt-10 divide-y divide-ink-200 overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-card">
                {p.services.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-4 px-6 py-5 transition-colors hover:bg-ink-50">
                    <div className="flex min-w-0 items-start gap-3.5">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-100">
                        <Tag className="size-5 text-brand-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-base font-bold text-ink-950">{s.name}</p>
                        {s.description ? <p className="mt-0.5 text-sm leading-snug text-ink-500">{s.description}</p> : null}
                        {s.duration_minutes ? <p className="mt-1 text-xs text-ink-400">{s.duration_minutes} min</p> : null}
                      </div>
                    </div>
                    <span className="shrink-0 whitespace-nowrap text-lg font-extrabold text-brand-600">
                      {s.price != null ? formatCurrency(s.price) : "Call us"}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollReveal>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg"><Link href={orderHref}><FileText /> Order prescription</Link></Button>
              {p.offers_consultation ? (
                <Button asChild size="lg" variant="outline"><Link href={consultHref}><Stethoscope /> Ask a pharmacist</Link></Button>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {/* ── Consultation topics ──────────────────────────────── */}
      {p.offers_consultation && p.issues.length ? (
        <section className="border-y border-ink-200 bg-brand-50 py-16">
          <div className="mx-auto max-w-[1200px] px-6">
            <ScrollReveal>
              <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.3fr]">
                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-widest text-brand-600">Talk to us</p>
                  <h2 className="text-3xl font-extrabold tracking-tight text-ink-950">We can help with more than prescriptions</h2>
                  <p className="mt-3 leading-relaxed text-ink-500">
                    Pick a topic and one of our pharmacists will call you back — usually the same day. No appointment, no booking fee.
                  </p>
                </div>
                <ul className="flex flex-wrap gap-2">
                  {p.issues.map((i) => (
                    <li key={i.id}>
                      <Link
                        href={`${consultHref}&issue=${i.slug}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-4 py-2 text-sm font-medium text-ink-700 no-underline transition-soft hover:border-brand-600 hover:text-brand-700"
                      >
                        <Stethoscope className="size-3.5 text-brand-600" />
                        {i.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>
          </div>
        </section>
      ) : null}

      {/* ── Gallery ──────────────────────────────────────────── */}
      {p.galleryUrls.length ? (
        <section className="bg-white py-16">
          <div className="mx-auto max-w-[1200px] px-6">
            <h2 className="mb-6 text-center text-2xl font-extrabold tracking-tight text-ink-950">Inside our pharmacy</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {p.galleryUrls.map((g) => (
                <ImageWithFallback key={g} src={g} alt="" wrapperClassName="aspect-[4/3] w-full rounded-2xl" />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ── Visit us ─────────────────────────────────────────── */}
      <section id="visit" className="scroll-mt-20 border-t border-ink-200 bg-ink-50 py-20">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="grid gap-10 lg:grid-cols-2">
            <ScrollReveal>
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-brand-600">Visit us</p>
              <h2 className="text-3xl font-extrabold tracking-tight text-ink-950">Opening hours</h2>
              <dl className="mt-6 divide-y divide-ink-200 overflow-hidden rounded-2xl border border-ink-200 bg-white">
                {DAY_KEYS.map((d) => {
                  const h = hours[d];
                  const closed = !h || h.closed;
                  return (
                    <div key={d} className="flex items-center justify-between px-5 py-3">
                      <dt className="text-sm font-medium text-ink-700">{DAY_LABELS[d]}</dt>
                      <dd className={cn("text-sm tabular-nums", closed ? "text-ink-400" : "font-semibold text-ink-950")}>
                        {closed ? "Closed" : `${formatTime(h.open)} – ${formatTime(h.close)}`}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </ScrollReveal>

            <ScrollReveal delay={120}>
              <div className="space-y-4">
                <div className="rounded-2xl border border-ink-200 bg-white p-6">
                  <p className="flex items-start gap-3 text-ink-700">
                    <MapPin className="mt-0.5 size-5 shrink-0 text-brand-600" />
                    <span>{fullAddress}</span>
                  </p>
                  {p.phone ? (
                    <p className="mt-3 flex items-center gap-3 text-ink-700">
                      <Phone className="size-5 shrink-0 text-brand-600" />
                      <a href={`tel:${p.phone}`} className="no-underline hover:text-brand-700">{p.phone}</a>
                    </p>
                  ) : null}
                  {p.estimated_delivery_time ? (
                    <p className="mt-3 flex items-center gap-3 text-ink-700">
                      <Clock className="size-5 shrink-0 text-brand-600" />
                      Typical delivery: {p.estimated_delivery_time}
                    </p>
                  ) : null}
                  {p.accessibility_notes ? (
                    <p className="mt-3 flex items-start gap-3 text-sm text-ink-500">
                      <Accessibility className="mt-0.5 size-5 shrink-0 text-brand-600" />
                      {p.accessibility_notes}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-ink-200 bg-white p-6">
                  <p className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-500">Why patients choose us</p>
                  <ul className="space-y-3">
                    {[
                      { t: "Licensed and regulated", d: "A fully licensed community pharmacy you can verify." },
                      { t: "Fast and convenient", d: "Order online for delivery without leaving home." },
                      { t: "A caring local team", d: "Real pharmacists who know your community." },
                    ].map((i) => (
                      <li key={i.t} className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-brand-600" />
                        <span>
                          <span className="block text-sm font-bold text-ink-950">{i.t}</span>
                          <span className="block text-sm text-ink-500">{i.d}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────── */}
      <section className="bg-brand-600 px-6 py-20 text-center">
        <div className="mx-auto max-w-[680px]">
          <CalendarClock className="mx-auto mb-5 size-10 text-white/80" />
          <h2 className="text-[clamp(1.8rem,4vw,2.6rem)] font-extrabold tracking-tight text-white">Your prescription, delivered</h2>
          <p className="mx-auto mt-3 max-w-[500px] leading-relaxed text-white/80">
            Send us your prescription in under two minutes. We&#39;ll take care of the rest and bring it right to your door.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" variant="white"><Link href={orderHref}>Order prescription <ArrowRight /></Link></Button>
            {p.phone ? (
              <Button asChild size="lg" variant="outline" className="border-white/40 bg-transparent text-white hover:border-white hover:text-white">
                <a href={`tel:${p.phone}`}><Phone /> Call {p.phone}</a>
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <PharmacyFooter pharmacy={chrome} address={fullAddress} />
      <StickyOrderBar pharmacy={chrome} />
      <div className="h-16 md:hidden" />
    </div>
  );
}

function ServiceChip({ icon: Icon, label, tone }: { icon: typeof Truck; label: string; tone: "teal" | "blue" | "purple" }) {
  const tones = {
    teal: "bg-brand-100 text-brand-700",
    blue: "bg-blue-50 text-blue-700",
    purple: "bg-purple-50 text-purple-700",
  } as const;
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold", tones[tone])}>
      <Icon className="size-4" />
      {label}
    </span>
  );
}
