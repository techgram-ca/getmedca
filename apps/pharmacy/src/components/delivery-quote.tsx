"use client";

import { useEffect, useState } from "react";
import { Loader2, Truck } from "lucide-react";
import { zoneLabel, type AddressQuote } from "@getmed/core/pricing";
import { formatCurrency, formatDistance } from "@getmed/core/format";
import { cn } from "@getmed/ui";
import { quoteAddressAction } from "@/lib/actions/orders";

type Address = { postalCode?: string | null; lat?: number | null; lng?: number | null } | null;

/** Identifies the address a result belongs to, so a stale one is never shown. */
function addressKey(address: Address): string | null {
  if (!address || address.lat == null || address.lng == null) return null;
  return `${address.postalCode ?? ""}:${address.lat},${address.lng}`;
}

/**
 * The delivery cost for the address just picked, shown while the order is being
 * entered rather than after it is placed.
 *
 * Quoted through the same rules the order will be priced by, so what shows here
 * is what gets charged. A remote address gives a range because an admin still
 * confirms the exact figure — the charge can never exceed the top of it.
 */
export function DeliveryQuote({ address, className }: { address: Address; className?: string }) {
  // Held with the address it was fetched for rather than cleared on change, so
  // a result that arrives after the address moved on is simply not shown.
  const [result, setResult] = useState<{ key: string; quote: AddressQuote | null } | null>(null);
  const key = addressKey(address);
  const quote = result?.key === key ? result.quote : null;
  const loading = key !== null && result?.key !== key;

  useEffect(() => {
    if (!key || !address) return;
    let cancelled = false;
    quoteAddressAction({
      postalCode: address.postalCode ?? null,
      lat: address.lat ?? null,
      lng: address.lng ?? null,
    }).then((r) => {
      if (!cancelled) setResult({ key, quote: r.ok ? r.quote : null });
    });
    return () => {
      cancelled = true;
    };
    // Keyed on the picked address, so re-picking the same one costs nothing.
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!key) return null;

  return (
    <p className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 text-sm", className)}>
      <span className="inline-flex items-center gap-1.5 text-ink-500">
        {loading ? <Loader2 className="size-4 animate-spin text-brand-600" /> : <Truck className="size-4 text-brand-600" />}
        Delivery cost
      </span>
      {loading ? (
        <span className="text-ink-500">working it out…</span>
      ) : quote?.kind === "tagged" ? (
        <>
          <span className="font-semibold text-ink-950">{formatCurrency(quote.price)}</span>
          <span className="text-xs text-ink-500">{zoneLabel(quote.zone)}</span>
        </>
      ) : quote?.kind === "remote" ? (
        <>
          <span className="font-semibold text-ink-950">
            {formatCurrency(quote.quote.min)} – {formatCurrency(quote.quote.max)}
          </span>
          <span className="text-xs text-ink-500">
            {zoneLabel(quote.zone)} · {formatDistance(quote.distanceM)} · GetMed confirms the exact amount
          </span>
        </>
      ) : (
        <span className="text-ink-500">GetMed will price this one and show it on the order.</span>
      )}
    </p>
  );
}
