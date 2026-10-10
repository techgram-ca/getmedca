import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Clock, Inbox, MapPin, ShieldCheck, Truck, Wallet } from "lucide-react";
import { createServiceClient } from "@getmed/db/service";
import { formatCurrency } from "@getmed/core/format";
import { Button, Logo } from "@getmed/ui";

export const dynamic = "force-dynamic";

type Card = {
  city: string;
  slug: string;
  note: string | null;
  rows: { destination: string; price: number }[];
};

async function loadCard(slug: string): Promise<Card | null> {
  const db = createServiceClient();
  const { data: card } = await db
    .from("delivery_rate_cards")
    .select("city, slug, note, published, id")
    .eq("slug", slug)
    .maybeSingle();
  // An unpublished card is a draft. It has to read as "no such page" rather
  // than "not yet", or the link gets shared before the rates are agreed.
  if (!card || !card.published) return null;

  const { data: rows } = await db
    .from("delivery_rate_rows")
    .select("destination, price")
    .eq("card_id", card.id)
    .order("sort_order");

  return {
    city: card.city,
    slug: card.slug,
    note: card.note,
    rows: (rows ?? []).map((r) => ({ destination: r.destination, price: Number(r.price) })),
  };
}

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const { city } = await params;
  const card = await loadCard(city);
  if (!card) return { title: "Delivery rates" };
  return {
    title: `Delivery rates in ${card.city}`,
    description: `What GetMed charges a ${card.city} pharmacy to deliver, per order, with no contract and no monthly fee.`,
    // The rest of this app is deliberately not indexed. A rate card is the one
    // page here meant to be found by a pharmacy that has not heard of us.
    robots: { index: true, follow: true },
    alternates: { canonical: `/delivery-rates/${card.slug}` },
  };
}

export default async function DeliveryRatesPage({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;
  const card = await loadCard(city);
  if (!card) notFound();

  const lowest = Math.min(...card.rows.map((r) => r.price));

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-ink-200">
        <div className="mx-auto flex h-16 max-w-[1100px] items-center justify-between px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2.5 no-underline">
            <Logo />
            <span className="ml-1.5 hidden items-center rounded-full bg-brand-100 px-2.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-brand-600 sm:inline-flex">
              For Pharmacies
            </span>
          </Link>
          {/* "Sign in" goes at phone width: the logo, a secondary link and the
              CTA do not fit across 390px, and the CTA is the one that matters
              to someone who arrived here from a rate card. */}
          <div className="flex shrink-0 items-center gap-4">
            <Link href="/login" className="hidden text-sm font-medium text-ink-500 no-underline hover:text-ink-950 sm:inline">Sign in</Link>
            <Button asChild size="sm"><Link href="/signup">Create free account</Link></Button>
          </div>
        </div>
      </header>

      {/* ---------------- Hero ---------------- */}
      <section className="bg-gradient-to-b from-brand-50 to-white px-6 py-14 sm:py-20">
        <div className="mx-auto max-w-[1100px]">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-600/20 bg-white px-3.5 py-1.5 text-xs font-semibold text-brand-700">
            <MapPin className="size-3.5" />
            {card.city}
          </div>
          <h1 className="mt-5 max-w-[20ch] text-balance text-[clamp(2rem,5vw,3.4rem)] font-extrabold leading-[1.1] tracking-tight text-ink-950">
            Delivery rates for <span className="text-brand-600">{card.city}</span> pharmacies
          </h1>
          <p className="mt-5 max-w-[60ch] text-pretty text-[1.05rem] leading-[1.75] text-ink-600">
            Competitive, flat per-delivery pricing — from {formatCurrency(lowest)} an order — with no contract, no
            monthly fee and no commission on what you dispense. You pay only when an order is delivered, and the
            service that gets it there is ours end to end.
          </p>
        </div>
      </section>

      {/* ---------------- Who delivers, and external orders ---------------- */}
      <section className="px-6 py-14">
        <div className="mx-auto max-w-[1100px]">
          <h2 className="text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">Every delivery is ours to run</h2>
          <p className="mt-4 max-w-[70ch] text-[1.02rem] leading-[1.75] text-ink-600">
            Orders placed through GetMed are delivered by the GetMed team — our own trained drivers, our own
            cold-chain and controlled-substance handling, our own proof of delivery at the door. We do not hand your
            patients to a third-party courier or a gig app, because the people carrying someone&rsquo;s medication are
            the whole of whether this is trustworthy. That is the service you are buying, and it is the service your
            patient gets.
          </p>

          <div className="mt-8 rounded-2xl border border-brand-600/20 bg-brand-50 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600">
                <Inbox className="size-5" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-ink-950">Bring us your other orders too</h3>
                <p className="mt-2 max-w-[65ch] text-[0.975rem] leading-[1.7] text-ink-600">
                  You are not limited to orders that come from GetMed. If a prescription reaches you by phone, by fax,
                  through your own website or over the counter, you can hand that delivery to us as well — the price is
                  the same, and so is the process. It is already built into your dashboard: add the order, we pick it
                  up, and it is tracked and proven exactly like any other.
                </p>
                <p className="mt-3 text-sm font-medium text-brand-800">
                  Same rate card. Same drivers. Same proof of delivery. Whatever the order came in on.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- The rate card ---------------- */}
      <section className="bg-ink-50 px-6 py-14">
        {/* Same container as every other section, so the headings line up;
            the table itself is held narrower, because a price list stretched
            to full width puts the city and its rate a screen apart. */}
        <div className="mx-auto max-w-[1100px]">
          <h2 className="text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">What it costs</h2>
          <p className="mt-3 text-ink-600">
            What a pharmacy in {card.city} pays per delivery, by where it is going.
          </p>

          <div className="mt-7 max-w-[680px] overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-ink-200 bg-white px-5 py-3.5 sm:px-7">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-500">Delivering to</span>
              <span className="text-xs font-bold uppercase tracking-wider text-ink-500">Per order</span>
            </div>
            <ul className="list-none divide-y divide-ink-200">
              {card.rows.map((r) => (
                <li key={r.destination} className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-brand-50/50 sm:px-7">
                  <span className="font-medium text-ink-900">{r.destination}</span>
                  <span className="text-lg font-extrabold tabular-nums text-brand-700">{formatCurrency(r.price)}</span>
                </li>
              ))}
            </ul>
          </div>

          {card.note ? <p className="mt-4 max-w-[680px] text-sm text-ink-500">{card.note}</p> : null}

          <p className="mt-4 max-w-[680px] text-xs leading-relaxed text-ink-500">
            Rates are per delivered order and exclude applicable taxes. Refrigerated handling, where your pharmacy has
            it enabled, is added per order and shown to you before you mark an order ready. Deliveries beyond the
            cities listed are quoted by distance.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg"><Link href="/signup">Start taking deliveries</Link></Button>
            <Button asChild variant="outline" size="lg"><Link href="/">See how it works</Link></Button>
          </div>
        </div>
      </section>

      {/* ---------------- Why choose us ---------------- */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-[1100px]">
          <h2 className="text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">Why pharmacies choose GetMed</h2>
          <ul className="mt-8 grid list-none gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Wallet, title: "Pay per delivery", desc: "No contract, no monthly platform fee and no commission on what you dispense. An order that is not delivered is not billed." },
              { icon: Truck, title: "Our drivers, not a courier", desc: "Trained, screened and ours. The same people every week, who know a cold bag from a tote and a controlled substance from a vitamin." },
              { icon: ShieldCheck, title: "Proof at the door", desc: "A photo and a signature on every delivery, filed against the order. If a patient says it never arrived, you have the answer." },
              { icon: Clock, title: "Same-day as standard", desc: "Mark an order ready and a driver is routed to you. Your patient watches it move instead of phoning to ask." },
              { icon: Inbox, title: "Any order, any source", desc: "Phone, fax, walk-in or your own site — add it to the dashboard and it is delivered on the same terms." },
              { icon: BadgeCheck, title: "Built for Ontario", desc: "Data stored in Canada, handled under PHIPA and PIPEDA, and a patient consent record kept with every order." },
            ].map(({ icon: Icon, title, desc }) => (
              <li key={title} className="rounded-2xl border border-ink-200 p-6 transition-shadow hover:shadow-sm">
                <span className="flex size-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600"><Icon className="size-5" /></span>
                <h3 className="mt-4 font-bold text-ink-950">{title}</h3>
                <p className="mt-1.5 text-sm leading-[1.65] text-ink-600">{desc}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-ink-200 bg-ink-50 px-6 py-14">
        <div className="mx-auto flex max-w-[1100px] flex-col items-center text-center">
          <h2 className="text-2xl font-bold tracking-tight text-ink-950">Ready to deliver in {card.city}?</h2>
          <p className="mt-3 max-w-[52ch] text-ink-600">
            Setting up takes a few minutes and costs nothing. You are billed only when we deliver.
          </p>
          <Button asChild size="lg" className="mt-7"><Link href="/signup">Create your free account</Link></Button>
        </div>
      </section>

      <footer className="border-t border-ink-200 px-6 py-8">
        <p className="mx-auto max-w-[1100px] text-center text-sm text-ink-500">
          © {new Date().getFullYear()} GetMed Pharmacy Network
        </p>
      </footer>
    </div>
  );
}
