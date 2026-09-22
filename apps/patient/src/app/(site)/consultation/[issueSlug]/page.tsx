import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BadgeCheck, Clock, Languages, MapPin, Stethoscope } from "lucide-react";
import { createServiceClient } from "@getmed/db/service";
import { listConsultationPharmacists, type PharmacistListing } from "@getmed/core/consultations";
import { formatCurrency, formatDistance, formatDuration } from "@getmed/core/format";
import { Avatar, Badge, Button, EmptyState, cn } from "@getmed/ui";
import { IssueAddressSearch } from "@/components/issue-address-search";

export const dynamic = "force-dynamic";

type Params = { issueSlug: string };
type Search = { address?: string; lat?: string; lng?: string; lang?: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { issueSlug } = await params;
  const db = createServiceClient();
  const { data } = await db.from("issues").select("name, description").eq("slug", issueSlug).maybeSingle();
  return {
    title: data?.name ? `${data.name} consultation` : "Consultation",
    description: data?.description ?? undefined,
  };
}

export default async function IssuePage({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<Search> }) {
  const { issueSlug } = await params;
  const sp = await searchParams;
  const db = createServiceClient();
  const { data: issue } = await db.from("issues").select("*").eq("slug", issueSlug).eq("active", true).maybeSingle();
  if (!issue) notFound();

  const address = sp.address?.trim() ?? "";
  const lat = sp.lat ? Number(sp.lat) : undefined;
  const lng = sp.lng ? Number(sp.lng) : undefined;
  const language = sp.lang?.trim() || null;
  const hasLocation = !!address || (Number.isFinite(lat) && Number.isFinite(lng));

  const listing = hasLocation
    ? await listConsultationPharmacists(db, { address, lat, lng, issueSlug, language }).catch(() => null)
    : null;

  // Carry the address forward so patients are not asked for it again.
  const forward = new URLSearchParams();
  if (address) forward.set("address", address);
  if (listing?.origin) {
    forward.set("lat", String(listing.origin.lat));
    forward.set("lng", String(listing.origin.lng));
  }
  const q = forward.size ? `?${forward}` : "";

  /** The same page with one language selected, or with the filter cleared. */
  const languageHref = (value: string | null) => {
    const next = new URLSearchParams(forward);
    if (value) next.set("lang", value);
    return `/consultation/${issue.slug}${next.size ? `?${next}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <Link href="/consultation" className="text-sm font-medium text-ink-500 no-underline hover:text-brand-700">← All topics</Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3.5 py-1.5 text-xs font-semibold text-brand-600">
          <Stethoscope className="size-3.5" /> Step 2 of 2
        </span>
        <span className="text-sm text-ink-500">Topic chosen: <span className="font-semibold text-ink-950">{issue.name}</span></span>
      </div>

      <h1 className="mt-3 text-[clamp(1.9rem,4vw,2.6rem)] font-extrabold tracking-tight text-ink-950">
        {hasLocation ? `Pharmacists for ${issue.name.toLowerCase()}` : "Where should we look?"}
      </h1>
      <p className="mt-2 max-w-xl text-ink-500">
        {hasLocation
          ? "These pharmacists take this consultation and are near you. Pick one and they'll call you back."
          : `Enter your address and we'll show pharmacists near you who take ${issue.name.toLowerCase()} consultations.`}
      </p>

      <div className="surface mt-8 rounded-2xl p-5">
        <IssueAddressSearch slug={issue.slug} initial={address} />
      </div>

      {listing ? (
        <div className="mt-8 space-y-3">
          {listing.languages.length > 1 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-700">
                <Languages className="size-4 text-brand-600" /> Speaks
              </span>
              <LanguageChip href={languageHref(null)} active={!language} label="Any language" />
              {listing.languages.map((l) => (
                <LanguageChip
                  key={l.value}
                  href={languageHref(l.value)}
                  active={language?.toLowerCase() === l.value}
                  label={l.label}
                  count={l.count}
                />
              ))}
            </div>
          ) : null}

          {listing.results.length === 0 ? (
            <EmptyState
              icon={<MapPin />}
              title={language ? `No pharmacist nearby speaks ${language}` : "No pharmacists offer this consultation nearby yet"}
              description={
                language
                  ? `${listing.filteredOut} ${listing.filteredOut === 1 ? "pharmacist is" : "pharmacists are"} available in another language.`
                  : "Try another address, or browse a different topic."
              }
              action={
                language ? (
                  <Button asChild variant="outline"><Link href={languageHref(null)}>Show every language</Link></Button>
                ) : (
                  <Button asChild variant="outline"><Link href="/consultation">Browse topics</Link></Button>
                )
              }
            />
          ) : (
            <>
              <p className="text-sm text-ink-500">
                {listing.results.length} {listing.results.length === 1 ? "pharmacist" : "pharmacists"} within {listing.radiusKm} km
                {language ? <> speaking <span className="font-medium text-ink-950">{language}</span></> : null}
              </p>
              {listing.results.map((entry) => (
                <PharmacistCard
                  key={`${entry.pharmacy.id}:${entry.pharmacistId ?? "pharmacy"}`}
                  entry={entry}
                  issueSlug={issue.slug}
                  pharmacyHref={`/p/${entry.pharmacy.slug}${q}`}
                />
              ))}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function LanguageChip({ href, active, label, count }: { href: string; active: boolean; label: string; count?: number }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium no-underline transition-soft",
        active
          ? "border-brand-600 bg-brand-600 text-white"
          : "border-ink-200 bg-white text-ink-700 hover:border-brand-600 hover:text-brand-700",
      )}
    >
      {label}
      {count != null ? <span className={cn("text-xs", active ? "text-white/70" : "text-ink-400")}>{count}</span> : null}
    </Link>
  );
}

function PharmacistCard({ entry, issueSlug, pharmacyHref }: { entry: PharmacistListing; issueSlug: string; pharmacyHref: string }) {
  const { pharmacy } = entry;
  const request = new URLSearchParams({ pharmacyId: pharmacy.id, issue: issueSlug });
  if (entry.pharmacistId) request.set("pharmacist", entry.pharmacistId);
  const credentials = [entry.credentials, entry.yearsExperience != null ? `${entry.yearsExperience} years' experience` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="surface flex gap-4 rounded-2xl p-4">
      <Avatar src={entry.photoUrl} name={entry.name} size={56} className="shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="flex flex-wrap items-center gap-2 font-bold text-ink-950">
              {entry.name}
              {entry.isMain ? <Badge tone="brand"><BadgeCheck className="size-3" /> Pharmacist in charge</Badge> : null}
            </h2>
            {credentials ? <p className="text-sm text-ink-500">{credentials}</p> : null}
            <p className="text-sm text-ink-500">
              at <Link href={pharmacyHref} className="font-medium no-underline hover:text-brand-700">{pharmacy.name}</Link>
              {pharmacy.city ? `, ${pharmacy.city}` : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="whitespace-nowrap text-lg font-extrabold text-brand-600">
              {entry.price != null ? formatCurrency(entry.price) : "No fee"}
            </p>
            <Badge tone={pharmacy.open ? "success" : "neutral"}>
              <span className={cn("size-1.5 rounded-full", pharmacy.open ? "bg-green-600" : "bg-ink-400")} /> {pharmacy.openLabel}
            </Badge>
          </div>
        </div>

        {entry.languages.length ? (
          <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-ink-500">
            <Languages className="size-3.5 text-brand-600" />
            Speaks {entry.languages.join(", ")}
          </p>
        ) : null}

        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-500">
          <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" /> {formatDistance(pharmacy.drivingDistanceM)}</span>
          {pharmacy.drivingDurationS != null ? (
            <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> {formatDuration(pharmacy.drivingDurationS)}</span>
          ) : null}
        </div>

        <div className="mt-3 flex justify-end">
          <Button asChild size="sm">
            <Link href={`/consultation/request?${request}`}>Request a call <ArrowRight /></Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
