"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight, MapPin, Phone, Search, Store } from "lucide-react";
import { Avatar, Badge, Button, EmptyState, Input, cn } from "@getmed/ui";

export type DirectoryResult = {
  id: string;
  slug: string;
  name: string | null;
  city: string | null;
  postal_code: string | null;
  address: string;
  phone: string | null;
  tagline: string | null;
  logoUrl: string | null;
  offersDelivery: boolean;
  offersConsultation: boolean;
  openNow: { open: boolean; label: string };
};

/**
 * Finding one particular pharmacy, rather than whichever is closest.
 *
 * Every card leads to the pharmacy's own page, not to the order form. Someone
 * who searched for their family pharmacy by name is checking it is really
 * theirs — the right branch, the right hours — and dropping them straight
 * into a prescription upload skips the question they came to ask.
 */
export function PharmacyDirectory({
  q,
  searched,
  results,
}: {
  q: string;
  /** False when nothing was typed yet, which is not the same as no matches. */
  searched: boolean;
  results: DirectoryResult[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [text, setText] = useState(q);
  const [busy, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = text.trim();
    const sp = new URLSearchParams(params.toString());
    if (next) sp.set("q", next);
    else sp.delete("q");
    start(() => router.push(sp.size ? `/pharmacies?${sp}` : "/pharmacies"));
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="text-center">
        <h1 className="text-[clamp(1.8rem,4vw,2.4rem)] font-extrabold tracking-tight text-ink-950">
          Find your pharmacy
        </h1>
        <p className="mx-auto mt-3 max-w-[520px] leading-relaxed text-ink-500">
          Already have a pharmacy you trust? Search for it by name, city or postal code and order from it
          directly — wherever it is.
        </p>
      </div>

      <form className="mx-auto mt-7 flex max-w-xl flex-col gap-2 sm:flex-row" onSubmit={submit}>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Pharmacy name, city or postal code"
          aria-label="Pharmacy name, city or postal code"
          className="flex-1"
          autoFocus
        />
        <Button type="submit" loading={busy} loadingText="Searching…" className="sm:w-auto">
          <Search /> Search
        </Button>
      </form>

      <div className="mt-8 space-y-3">
        {!searched ? (
          <p className="text-center text-sm text-ink-500">
            Type at least two characters. A postal code like <span className="font-mono">L7E</span> finds
            everything in that area.
          </p>
        ) : results.length === 0 ? (
          <EmptyState
            icon={<Store />}
            title={`No pharmacy matching “${q}”`}
            description="It may not be on GetMed yet. Try its city or postal code, or ask them to join — we are adding pharmacies across Ontario."
          />
        ) : (
          <>
            <p className="text-sm text-ink-500">
              {results.length} {results.length === 1 ? "pharmacy" : "pharmacies"} matching{" "}
              <span className="font-medium text-ink-700">{q}</span>
            </p>
            {results.map((r) => (
              <Link
                key={r.id}
                href={`/p/${r.slug}`}
                className="surface flex gap-4 p-4 no-underline transition-soft hover:border-brand-400 hover:shadow-card"
              >
                <Avatar src={r.logoUrl} name={r.name ?? "Pharmacy"} size={52} className="shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink-900">{r.name ?? "Pharmacy"}</p>
                      <p className="truncate text-sm text-ink-500">{r.address || r.postal_code}</p>
                    </div>
                    <Badge tone={r.openNow.open ? "success" : "neutral"}>
                      <span className={cn("size-1.5 rounded-full", r.openNow.open ? "bg-green-600" : "bg-ink-400")} />
                      {r.openNow.label}
                    </Badge>
                  </div>
                  {r.tagline ? <p className="mt-1 line-clamp-1 text-sm text-ink-600">{r.tagline}</p> : null}
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-600">
                    {r.postal_code ? (
                      <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" /> {r.postal_code}</span>
                    ) : null}
                    {r.phone ? (
                      <span className="inline-flex items-center gap-1"><Phone className="size-3.5" /> {r.phone}</span>
                    ) : null}
                    {r.offersDelivery ? <Badge tone="brand">Delivery</Badge> : null}
                    {r.offersConsultation ? <Badge tone="brand">Consultations</Badge> : null}
                    <span className="ml-auto inline-flex items-center gap-1 font-medium text-brand-700">
                      View pharmacy <ArrowRight className="size-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * The way out of a list that did not contain the one pharmacy they wanted.
 *
 * Shown under the nearest-ten results and on the home page. The nearest ten
 * are the ten nearest — someone whose family pharmacy is the eleventh, or in
 * the town they grew up in, has no way to reach it from a list sorted by
 * distance, and no reason to guess that one exists.
 */
export function FindYourPharmacyCard({ className }: { className?: string }) {
  return (
    <div className={cn("surface flex flex-col items-start gap-3 bg-brand-50 p-5 sm:flex-row sm:items-center", className)}>
      <Store className="size-5 shrink-0 text-brand-600 sm:mt-0.5 sm:self-start" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink-950">Missing your usual pharmacy?</p>
        <p className="mt-0.5 text-sm leading-relaxed text-ink-600">
          If the pharmacy your family uses is not in this list, search for it by name and order from it directly.
        </p>
      </div>
      <Button asChild variant="outline" className="shrink-0 bg-white">
        <Link href="/pharmacies"><Search /> Search by name</Link>
      </Button>
    </div>
  );
}
