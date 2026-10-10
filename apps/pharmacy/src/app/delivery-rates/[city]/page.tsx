import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Clock, Inbox, MapPin, ShieldCheck, Truck, Wallet } from "lucide-react";
import { createServiceClient } from "@getmed/db/service";
import { formatCurrency } from "@getmed/core/format";
import { groupRatesByPrice } from "@getmed/core/pricing";
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
  // Eight cities at three prices is three facts, not eight.
  const groups = groupRatesByPrice(card.rows);

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
      <section className="bg-gradient-to-b from-brand-50 to-white px-6 pb-10 pt-12 sm:pb-12 sm:pt-16">
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

      {/* ---------------- Who delivers ---------------- */}
      <section className="px-6 pb-12 pt-2">
        <div className="mx-auto max-w-[1100px]">
          <h2 className="text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">We handle the delivery</h2>
          <p className="mt-4 max-w-[68ch] text-[1.02rem] leading-[1.75] text-ink-600">
            Every GetMed order is delivered by the GetMed team — our own trained drivers, our own cold-chain and
            controlled-substance handling, and proof of delivery at the door. You can send us your other deliveries
            too: a prescription that came in by phone, by fax, through your own site or over the counter goes on the
            same rates and the same process, straight from your dashboard.
          </p>
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
              {groups.map((g) => (
                <li key={g.price} className="flex items-start justify-between gap-5 px-5 py-4 transition-colors hover:bg-brand-50/50 sm:px-7">
                  <span className="font-medium leading-[1.5] text-ink-900">{g.destinations.join(", ")}</span>
                  <span className="shrink-0 text-lg font-extrabold tabular-nums text-brand-700">{formatCurrency(g.price)}</span>
                </li>
              ))}
            </ul>
          </div>

          {card.note ? <p className="mt-4 max-w-[680px] text-sm text-ink-500">{card.note}</p> : null}

          {/* Cutoffs belong next to the price, not in the small print: they are
              the other half of what a pharmacy needs to answer a patient. */}
          <div className="mt-6 max-w-[680px] rounded-2xl border border-ink-200 bg-white p-5">
            <p className="flex items-center gap-2 text-sm font-bold text-ink-950">
              <Clock className="size-4 text-brand-600" /> Cutoff times
            </p>
            <ul className="mt-3 list-none space-y-2.5 text-sm text-ink-600">
              <li>
                <span className="font-semibold text-ink-900">Your own orders:</span> add them by{" "}
                <span className="font-semibold text-ink-900">1:00 PM</span> for same-day delivery. Anything later goes
                out the next day.
              </li>
              <li>
                <span className="font-semibold text-ink-900">GetMed orders:</span> patients are told to order before{" "}
                <span className="font-semibold text-ink-900">11:00 AM</span> for same-day delivery, so these arrive
                with the cutoff already accounted for.
              </li>
            </ul>
          </div>

          <p className="mt-4 max-w-[680px] text-xs leading-relaxed text-ink-500">
            Rates are per delivered order and exclude applicable taxes. Refrigerated handling may cost more.
            Deliveries beyond the cities listed are quoted by distance.
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
