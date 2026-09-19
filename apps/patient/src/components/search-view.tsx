"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Clock, MapPin, Phone } from "lucide-react";
import type { SearchResponse, SearchResult } from "@getmed/core/geo";
import { formatDistance, formatDuration } from "@getmed/core/format";
import { Alert, Avatar, Badge, Button, EmptyState, cn } from "@getmed/ui";
import { HomeSearchInline } from "./home-search-inline";

const SearchMap = dynamic(() => import("./search-map").then((m) => m.SearchMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-ink-100" />,
});

export function SearchView({ address, response, error }: { address: string; response: SearchResponse; error: string | null }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const { results, origin, radiusKm } = response;

  // Pass the address the patient searched with (and its coordinates) through to
  // the pharmacy page and order form, so they are never asked for it twice.
  const params = new URLSearchParams();
  if (address) params.set("address", address);
  if (origin) {
    params.set("lat", String(origin.lat));
    params.set("lng", String(origin.lng));
  }
  const q = params.size ? `?${params}` : "";

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pharmacies near you</h1>
          {origin ? (
            <p className="mt-1 text-sm text-ink-500">
              {results.length} {results.length === 1 ? "pharmacy" : "pharmacies"} within {radiusKm} km of <span className="font-medium text-ink-700">{origin.placeName}</span>
            </p>
          ) : (
            <p className="mt-1 text-sm text-ink-500">Enter an address to see nearby pharmacies.</p>
          )}
        </div>
        <HomeSearchInline className="lg:w-[28rem]" />
      </div>

      {error ? <Alert tone="danger" title="We couldn't run that search">{error}</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          {origin && results.length === 0 && !error ? (
            <EmptyState
              icon={<MapPin />}
              title="No pharmacies in range yet"
              description={`We haven't onboarded a pharmacy within ${radiusKm} km of that address. Try a nearby address, or check back soon — we're adding pharmacies across Ontario.`}
            />
          ) : null}
          {results.map((r) => (
            <ResultCard key={r.id} r={r} active={activeId === r.id} onHover={() => setActiveId(r.id)} q={q} />
          ))}
        </div>
        <div className="sticky top-24 hidden h-[calc(100vh-7rem)] overflow-hidden rounded-2xl border border-ink-200 lg:block">
          <SearchMap origin={origin} results={results} activeId={activeId} onActivate={setActiveId} />
        </div>
      </div>
    </div>
  );
}

function ResultCard({ r, active, onHover, q }: { r: SearchResult; active: boolean; onHover: () => void; q: string }) {
  return (
    <article
      onMouseEnter={onHover}
      onFocus={onHover}
      className={cn("surface flex gap-4 p-4 transition-soft", active && "ring-2 ring-brand-400 ring-offset-1")}
    >
      <Avatar src={r.logoUrl} name={r.name} size={56} className="shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="font-semibold text-ink-900">
              <Link href={`/p/${r.slug}${q}`} className="focus-ring rounded-sm hover:text-brand-700">{r.name}</Link>
            </h2>
            <p className="text-sm text-ink-500">{[r.addressLine, r.city].filter(Boolean).join(", ")}</p>
          </div>
          <Badge tone={r.open ? "success" : "neutral"}>
            <span className={cn("size-1.5 rounded-full", r.open ? "bg-green-600" : "bg-ink-400")} /> {r.openLabel}
          </Badge>
        </div>
        {r.tagline ? <p className="mt-1.5 line-clamp-1 text-sm text-ink-600">{r.tagline}</p> : null}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-600">
          <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" /> {formatDistance(r.drivingDistanceM)} driving</span>
          {r.drivingDurationS != null ? <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> {formatDuration(r.drivingDurationS)}</span> : null}
          {r.phone ? <span className="inline-flex items-center gap-1"><Phone className="size-3.5" /> {r.phone}</span> : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {r.offersDelivery ? <Badge tone="brand">Delivery</Badge> : null}
          {r.offersTransfer ? <Badge tone="brand">Transfers</Badge> : null}
          {r.offersConsultation ? <Badge tone="brand">Consultations</Badge> : null}
          <span className="flex-1" />
          <Button asChild size="sm">
            <Link href={`/order/new?pharmacyId=${r.id}${q ? `&${q.slice(1)}` : ""}`}>Order here <ArrowRight /></Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
