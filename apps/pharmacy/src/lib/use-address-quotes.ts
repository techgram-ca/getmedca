"use client";

import { useEffect, useState } from "react";
import type { AddressQuote } from "@getmed/core/pricing";
import { quoteAddressAction } from "@/lib/actions/orders";

export type QuoteAddress = { postalCode?: string | null; lat?: number | null; lng?: number | null } | null;

export type QuoteState = { quote: AddressQuote | null; error?: string } | undefined;

/** Identifies the address a result belongs to, so a stale one is never shown. */
export function addressKey(address: QuoteAddress): string | null {
  if (!address || address.lat == null || address.lng == null) return null;
  return `${address.postalCode ?? ""}:${address.lat},${address.lng}`;
}

/**
 * Prices a set of addresses at once, keyed by address rather than by row.
 *
 * The order form takes up to twenty deliveries in one submission and needs a
 * total across them, which a per-row fetch cannot produce — the parent has to
 * hold the results. Keying by address also means two rows going to the same
 * place cost one quote, and a row that moves never shows the previous
 * address's price while the new one loads.
 *
 * Results are kept, not cleared, so re-picking an address already quoted is
 * free and an answer arriving late for an address since changed is ignored.
 */
export function useAddressQuotes(addresses: QuoteAddress[]) {
  const [byKey, setByKey] = useState<Record<string, QuoteState>>({});
  const keys = addresses.map(addressKey);
  // Stable across renders that did not change which addresses are on screen.
  const wanted = [...new Set(keys.filter((k): k is string => k !== null))].sort().join("|");

  useEffect(() => {
    const pending = wanted
      .split("|")
      .filter(Boolean)
      .filter((k) => !(k in byKey));
    if (pending.length === 0) return;

    let cancelled = false;
    for (const key of pending) {
      const address = addresses[keys.indexOf(key)];
      if (!address) continue;
      quoteAddressAction({
        postalCode: address.postalCode ?? null,
        lat: address.lat ?? null,
        lng: address.lng ?? null,
      }).then((r) => {
        if (cancelled) return;
        setByKey((m) => ({ ...m, [key]: r.ok ? { quote: r.quote } : { quote: null, error: r.error } }));
      });
    }
    return () => {
      cancelled = true;
    };
    // Driven by which addresses are on screen; `byKey` is read to skip ones
    // already priced, and listing it here would re-run on every result.
  }, [wanted]); // eslint-disable-line react-hooks/exhaustive-deps

  const stateFor = (address: QuoteAddress): { state: QuoteState; loading: boolean; pending: boolean } => {
    const key = addressKey(address);
    if (key === null) return { state: undefined, loading: false, pending: true };
    const state = byKey[key];
    return { state, loading: state === undefined, pending: false };
  };

  /** What the deliveries priced so far add up to, and how many are missing. */
  const total = (() => {
    let sum = 0;
    let priced = 0;
    let unpriced = 0;
    for (const key of keys) {
      if (key === null) {
        unpriced += 1;
        continue;
      }
      const price = priceOf(byKey[key]);
      if (price == null) unpriced += 1;
      else {
        sum += price;
        priced += 1;
      }
    }
    return { sum, priced, unpriced };
  })();

  return { stateFor, total };
}

/** The amount a quote settles on, or null when it could not be worked out. */
export function priceOf(state: QuoteState): number | null {
  const quote = state?.quote;
  if (!quote) return null;
  return quote.kind === "unknown" ? null : quote.price;
}
