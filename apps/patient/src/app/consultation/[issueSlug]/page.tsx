import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Clock, MapPin, Phone } from "lucide-react";
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
  return { title: `${issueSlug.replace(/-/g, " ")} consultation` };
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
  const response = address || (lat != null && lng != null)
    ? await searchPharmacies(db, { address, lat, lng, issueSlug }).catch(() => ({ origin: null, radiusKm: 0, results: [] }))
    : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <Link href="/consultation" className="text-sm text-ink-500 hover:text-brand-700">← All topics</Link>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{issue.name}</h1>
      {issue.description ? <p className="mt-2 text-ink-600">{issue.description}</p> : null}

      <div className="surface mt-8 p-4">
        <p className="mb-2 text-sm font-medium text-ink-700">Where are you? We'll show pharmacies offering this consultation nearby.</p>
        <IssueAddressSearch slug={issue.slug} initial={address} />
      </div>

      {response ? (
        <div className="mt-8 space-y-3">
          {response.results.length === 0 ? (
            <EmptyState icon={<MapPin />} title="No pharmacies offer this consultation nearby yet" description="Try another address, or browse a different topic." />
          ) : (
            response.results.map((r) => (
              <article key={r.id} className="surface flex gap-4 p-4">
                <Avatar src={r.logoUrl} name={r.name} size={52} className="shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h2 className="font-semibold"><Link href={`/p/${r.slug}?address=${encodeURIComponent(address)}`} className="hover:text-brand-700">{r.name}</Link></h2>
                      <p className="text-sm text-ink-500">{[r.addressLine, r.city].filter(Boolean).join(", ")}</p>
                    </div>
                    <Badge tone={r.open ? "success" : "neutral"}><span className={cn("size-1.5 rounded-full", r.open ? "bg-green-600" : "bg-ink-400")} /> {r.openLabel}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-600">
                    <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" /> {formatDistance(r.drivingDistanceM)}</span>
                    {r.drivingDurationS != null ? <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> {formatDuration(r.drivingDurationS)}</span> : null}
                    {r.phone ? <span className="inline-flex items-center gap-1"><Phone className="size-3.5" /> {r.phone}</span> : null}
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button asChild size="sm"><Link href={`/consultation/request?pharmacyId=${r.id}&issue=${issue.slug}`}>Request a call <ArrowRight /></Link></Button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
