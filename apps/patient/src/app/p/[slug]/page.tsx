import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Accessibility, ArrowRight, Clock, MapPin, Phone, ShieldCheck, Truck } from "lucide-react";
import { distanceToPharmacy } from "@getmed/core/geo";
import { DAY_KEYS, DAY_LABELS, formatTime, type WeeklyHours } from "@getmed/core/hours";
import { formatCurrency, formatDistance, formatDuration } from "@getmed/core/format";
import { Avatar, Badge, Button, Card, CardContent, cn } from "@getmed/ui";
import { getPublicPharmacy } from "@/lib/pharmacy";

export const dynamic = "force-dynamic";

type Params = { slug: string };
type Search = { address?: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPublicPharmacy(slug);
  return { title: p?.name ?? "Pharmacy", description: p?.tagline ?? undefined };
}

export default async function PharmacyPage({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<Search> }) {
  const { slug } = await params;
  const { address } = await searchParams;
  const p = await getPublicPharmacy(slug);
  if (!p) notFound();

  const distance = address && p.lat != null && p.lng != null ? await distanceToPharmacy(address, { lat: p.lat, lng: p.lng }).catch(() => null) : null;
  const hours = (p.hours ?? {}) as WeeklyHours;
  const main = p.pharmacists.find((s) => s.is_main) ?? p.pharmacists[0];
  const others = p.pharmacists.filter((s) => s.id !== main?.id);
  const orderHref = `/order/new?pharmacyId=${p.id}${address ? `&address=${encodeURIComponent(address)}` : ""}`;

  return (
    <div>
      <div className="relative h-48 w-full bg-gradient-to-r from-brand-700 to-brand-500 sm:h-64">
        {p.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.coverUrl} alt="" className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="rounded-2xl border-4 border-white bg-white shadow-card">
            <Avatar src={p.logoUrl} name={p.name ?? "Pharmacy"} size={96} className="rounded-xl" />
          </div>
          <div className="flex-1 pb-1">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{p.name}</h1>
            {p.tagline ? <p className="text-ink-600">{p.tagline}</p> : null}
          </div>
          <div className="flex flex-wrap gap-2 pb-1">
            <Badge tone={p.openNow.open ? "success" : "neutral"} className="h-8 px-3 text-sm">
              <span className={cn("size-2 rounded-full", p.openNow.open ? "bg-green-600 animate-pulse" : "bg-ink-400")} /> {p.openNow.label}
            </Badge>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-8">
            {p.bio ? <p className="leading-relaxed text-ink-700">{p.bio}</p> : null}

            <section>
              <h2 className="text-lg font-semibold">Services</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {p.offers_delivery ? <Badge tone="brand" className="py-1"><Truck className="size-3.5" /> Prescription delivery</Badge> : null}
                {p.offers_transfer ? <Badge tone="brand" className="py-1"><ArrowRight className="size-3.5" /> Prescription transfers</Badge> : null}
                {p.offers_consultation ? <Badge tone="brand" className="py-1"><Phone className="size-3.5" /> Pharmacist consultations</Badge> : null}
              </div>
              {p.issues.length ? (
                <div className="mt-4">
                  <p className="text-sm font-medium text-ink-700">Consultation topics</p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {p.issues.map((i) => (
                      <li key={i.id}>
                        <Link href={`/consultation/request?pharmacyId=${p.id}&issue=${i.slug}`} className="rounded-full border border-ink-200 bg-white px-3 py-1 text-sm text-ink-700 transition-soft hover:border-brand-400 hover:text-brand-700 focus-ring">
                          {i.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>

            {p.services.length ? (
              <section>
                <h2 className="text-lg font-semibold">Paid services</h2>
                <p className="text-sm text-ink-500">Booked by phone with the pharmacy — request a call-back below.</p>
                <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                  {p.services.map((s) => (
                    <li key={s.id} className="surface p-4">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-medium text-ink-900">{s.name}</h3>
                        {s.price != null ? <span className="text-sm font-semibold text-brand-700">{formatCurrency(s.price)}</span> : null}
                      </div>
                      {s.description ? <p className="mt-1 text-sm text-ink-600">{s.description}</p> : null}
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs text-ink-500">{s.duration_minutes ? `${s.duration_minutes} min` : ""}</span>
                        <Link href={`/consultation/request?pharmacyId=${p.id}&service=${s.id}`} className="text-sm font-medium text-brand-700 hover:underline">Request a call</Link>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {main ? (
              <section>
                <h2 className="text-lg font-semibold">Your pharmacists</h2>
                <Card className="mt-3">
                  <CardContent className="flex gap-5">
                    <Avatar src={main.photoUrl} name={main.name} size={80} className="shrink-0" />
                    <div>
                      <p className="font-semibold text-ink-900">{main.name}</p>
                      <p className="text-sm text-ink-500">
                        {[main.credentials, main.years_experience != null ? `${main.years_experience} yrs experience` : null].filter(Boolean).join(" · ")}
                      </p>
                      {main.bio ? <p className="mt-2 text-sm leading-relaxed text-ink-600">{main.bio}</p> : null}
                      {main.languages.length ? <p className="mt-2 text-xs text-ink-500">Speaks {main.languages.join(", ")}</p> : null}
                    </div>
                  </CardContent>
                </Card>
                {others.length ? (
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {others.map((s) => (
                      <li key={s.id} className="flex items-center gap-3 rounded-xl border border-ink-200 bg-white p-3">
                        <Avatar src={s.photoUrl} name={s.name} size={40} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{s.name}</p>
                          <p className="truncate text-xs text-ink-500">{s.credentials}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ) : null}

            {p.galleryUrls.length ? (
              <section>
                <h2 className="text-lg font-semibold">Gallery</h2>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {p.galleryUrls.map((g) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={g} src={g} alt="" className="aspect-[4/3] w-full rounded-xl object-cover" />
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <Card>
              <CardContent className="space-y-3">
                <Button asChild size="lg" className="w-full">
                  <Link href={orderHref}>Order from this pharmacy <ArrowRight /></Link>
                </Button>
                {p.offers_consultation ? (
                  <Button asChild variant="secondary" className="w-full">
                    <Link href={`/consultation/request?pharmacyId=${p.id}`}>Request a pharmacist call</Link>
                  </Button>
                ) : null}
                <p className="flex items-start gap-2 text-xs text-ink-500"><ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-brand-600" /> Licensed with the Ontario College of Pharmacists. Verified by GetMed.</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-3 text-sm">
                <p className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-ink-400" /> <span>{[p.address_line, p.city, p.postal_code].filter(Boolean).join(", ")}</span></p>
                {p.phone ? <p className="flex items-center gap-2"><Phone className="size-4 shrink-0 text-ink-400" /> <a href={`tel:${p.phone}`} className="hover:underline">{p.phone}</a></p> : null}
                {distance ? (
                  <p className="flex items-center gap-2"><Truck className="size-4 shrink-0 text-ink-400" /> {formatDistance(distance.distanceM)} · {formatDuration(distance.durationS)} drive from your address</p>
                ) : null}
                {p.estimated_delivery_time ? <p className="flex items-center gap-2"><Clock className="size-4 shrink-0 text-ink-400" /> Typical delivery: {p.estimated_delivery_time}</p> : null}
                {p.delivery_radius_km ? <p className="text-xs text-ink-500">Delivers up to {p.delivery_radius_km} km</p> : null}
                {p.accessibility_notes ? <p className="flex items-start gap-2 text-xs text-ink-500"><Accessibility className="mt-0.5 size-3.5 shrink-0" /> {p.accessibility_notes}</p> : null}
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <p className="mb-2 text-sm font-semibold">Hours</p>
                <dl className="space-y-1 text-sm">
                  {DAY_KEYS.map((d) => {
                    const h = hours[d];
                    return (
                      <div key={d} className="flex justify-between">
                        <dt className="text-ink-500">{DAY_LABELS[d]}</dt>
                        <dd className="tabular-nums">{!h || h.closed ? "Closed" : `${formatTime(h.open)} – ${formatTime(h.close)}`}</dd>
                      </div>
                    );
                  })}
                </dl>
              </CardContent>
            </Card>
            {p.accepted_insurance.length ? (
              <Card>
                <CardContent>
                  <p className="mb-2 text-sm font-semibold">Accepted insurance</p>
                  <div className="flex flex-wrap gap-1.5">
                    {p.accepted_insurance.map((i) => <Badge key={i}>{i}</Badge>)}
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </aside>
        </div>
      </div>
      <div className="h-16" />
    </div>
  );
}
