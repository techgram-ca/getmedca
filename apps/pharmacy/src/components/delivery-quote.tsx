"use client";

import { Loader2, Truck } from "lucide-react";
import { formatCurrency, formatDistance } from "@getmed/core/format";
import type { AddressQuote } from "@getmed/core/pricing";
import { Badge, cn } from "@getmed/ui";
import type { QuoteState } from "@/lib/use-address-quotes";

/** Why an address could not be priced, in terms the pharmacy can act on. */
const UNPRICEABLE: Record<Extract<AddressQuote, { kind: "unknown" }>["reason"], string> = {
  "no-coordinates": "Pick the address from the suggestions so we can price it.",
  "no-pharmacy-location": "Your pharmacy has no map location saved — add your address in Profile and this will price itself.",
  "no-route": "We couldn't find a driving route. GetMed will price this one and show it on the order.",
};

/**
 * The delivery cost for the address just picked, shown while the order is being
 * entered rather than after it is placed.
 *
 * It shows a price and nothing else. Which zone the address falls in is how the
 * price is worked out, not something a pharmacy has a decision to make about,
 * and naming four of them invited questions that had no useful answer. Only a
 * remote delivery says so, because its price moves with the distance and the
 * distance is worth seeing.
 *
 * Always renders once the row exists. Returning nothing until everything works
 * made a broken quote and an absent feature look identical from the outside.
 */
export function DeliveryQuote({
  state,
  loading,
  pending,
  className,
}: {
  state: QuoteState;
  /** The quote is in flight. */
  loading: boolean;
  /** No address picked yet, so there is nothing to quote. */
  pending: boolean;
  className?: string;
}) {
  const quote = state?.quote ?? null;

  return (
    <p className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 text-sm", className)}>
      <span className="inline-flex items-center gap-1.5 text-ink-500">
        {loading ? <Loader2 className="size-4 animate-spin text-brand-600" /> : <Truck className="size-4 text-brand-600" />}
        Delivery cost
      </span>
      {pending ? (
        <span className="text-ink-500">pick the address to see it</span>
      ) : loading ? (
        <span className="text-ink-500">working it out…</span>
      ) : state?.error ? (
        <span className="text-danger-500">{state.error}</span>
      ) : quote?.kind === "tagged" ? (
        <span className="font-semibold text-ink-950">{formatCurrency(quote.price)}</span>
      ) : quote?.kind === "remote" ? (
        <>
          <span className="font-semibold text-ink-950">{formatCurrency(quote.price)}</span>
          <Badge tone="accent">Remote</Badge>
          <span className="text-xs text-ink-500">{formatDistance(quote.distanceM)}</span>
        </>
      ) : (
        <span className="text-ink-500">{quote ? UNPRICEABLE[quote.reason] : "GetMed will price this one and show it on the order."}</span>
      )}
    </p>
  );
}
