import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Clock, MapPin, Phone, Stethoscope } from "lucide-react";
import { createServiceClient } from "@getmed/db/service";
import { searchPharmacies } from "@getmed/core/geo";
import { formatDistance, formatDuration } from "@getmed/core/format";
import { Avatar, Badge, Button, EmptyState, cn } from "@getmed/ui";
import { IssueAddressSearch } from "@/components/issue-address-search";

export const dynamic = "force-dynamic";

type Params = { issueSlug: string };
type Search = { address?: string; lat?: string; lng?: string };

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
  const hasLocation = !!address || (Number.isFinite(lat) && Number.isFinite(lng));
  const response = hasLocation
    ? await searchPharmacies(db, { address, lat, lng, issueSlug }).catch(() => ({ origin: null, radiusKm: 0, results: [] }))
    : null;

  // Carry the address forward so patients are not asked for it again.
  const forward = new URLSearchParams();
  if (address) forward.set("address", address);
  if (response?.origin) {
    forward.set("lat", String(response.origin.lat));
    forward.set("lng", String(response.origin.lng));
  }
  const q = forward.size ? `?${forward}` : "";

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
          ? "These pharmacies offer this consultation and deliver to your area. Pick one and a pharmacist will call you back."
          : `Enter your address and we'll show pharmacies near you that offer ${issue.name.toLowerCase()} consultations.`}
      </p>

      <div className="surface mt-8 rounded-2xl p-5">
        <IssueAddressSearch slug={issue.slug} initial={address} />
      </div>

      {response ? (
        <div className="mt-8 space-y-3">
          {response.results.length === 0 ? (
            <EmptyState
              icon={<MapPin />}
              title="No pharmacies offer this consultation nearby yet"
              description="Try another address, or browse a different topic."
              action={<Button asChild variant="outline"><Link href="/consultation">Browse topics</Link></Button>}
            />
          ) : (
            <>
              <p className="text-sm text-ink-500">
                {response.results.length} {response.results.length === 1 ? "pharmacy" : "pharmacies"} within {response.radiusKm} km
              </p>
              {response.results.map((r) => (
                <article key={r.id} className="surface flex gap-4 rounded-2xl p-4">
                  <Avatar src={r.logoUrl} name={r.name} size={52} className="shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h2 className="font-bold text-ink-950">
                          <Link href={`/p/${r.slug}${q}`} className="no-underline hover:text-brand-700">{r.name}</Link>
                        </h2>
                        <p className="text-sm text-ink-500">{[r.addressLine, r.city].filter(Boolean).join(", ")}</p>
                      </div>
                      <Badge tone={r.open ? "success" : "neutral"}>
                        <span className={cn("size-1.5 rounded-full", r.open ? "bg-green-600" : "bg-ink-400")} /> {r.openLabel}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-500">
                      <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" /> {formatDistance(r.drivingDistanceM)}</span>
                      {r.drivingDurationS != null ? (
                        <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> {formatDuration(r.drivingDurationS)}</span>
                      ) : null}
                      {r.phone ? <span className="inline-flex items-center gap-1"><Phone className="size-3.5" /> {r.phone}</span> : null}
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Button asChild size="sm">
                        <Link href={`/consultation/request?pharmacyId=${r.id}&issue=${issue.slug}`}>Request a call <ArrowRight /></Link>
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
