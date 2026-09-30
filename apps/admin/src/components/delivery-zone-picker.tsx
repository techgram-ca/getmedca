"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Lock, MapPin, Pencil, Ruler } from "lucide-react";
import { DELIVERY_ZONES, REMOTE_ZONE, type FixedZone, type PharmacyPricing } from "@getmed/core/pricing";
import { formatCurrency, formatDistance } from "@getmed/core/format";
import type { DeliveryPriceSource, DeliveryZone } from "@getmed/db/types";
import { Alert, Badge, Button, Field, FormError, Input, cn, toast } from "@getmed/ui";
import { setDeliveryZoneAction } from "@/lib/actions/orders";

type Props = {
  orderId: string;
  current: {
    zone: DeliveryZone | null;
    fee: number | null;
    source: DeliveryPriceSource | null;
    quoteMin: number | null;
    quoteMax: number | null;
  };
  pricing: PharmacyPricing;
  distanceM: number | null;
  city: string | null;
  postalCode: string | null;
  /** True once the driver has collected the order, after which the price is final. */
  locked: boolean;
};

/**
 * The zone and price for one order.
 *
 * A zone with a configured price needs nothing from an admin — it was settled
 * when the order arrived, so it is shown rather than asked. Only Zone 5, which
 * has no fixed price, and an order that could not be resolved at all put a
 * control on screen. Changing a settled zone is possible but deliberate.
 */
export function DeliveryZonePicker({ orderId, current, pricing, distanceM, city, postalCode, locked }: Props) {
  const router = useRouter();
  const isRemote = current.zone === REMOTE_ZONE;
  const unresolved = current.zone == null;
  const needsPrice = isRemote && current.fee == null;

  const [override, setOverride] = useState(false);
  const [zone, setZone] = useState<DeliveryZone | null>(current.zone);
  // Pre-filled with the bottom of the quoted span, which is the per-km price
  // itself — confirming without touching it charges exactly the configured rate.
  const [remotePrice, setRemotePrice] = useState(
    current.fee != null && isRemote ? String(current.fee) : current.quoteMin != null ? String(current.quoteMin) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const editing = override || unresolved || needsPrice;
  const editingRemote = zone === REMOTE_ZONE;
  const typed = Number(remotePrice);
  const outOfRange =
    editingRemote &&
    remotePrice.trim() !== "" &&
    ((current.quoteMin != null && typed < current.quoteMin) || (current.quoteMax != null && typed > current.quoteMax));

  const save = () =>
    start(async () => {
      if (!zone) return;
      setError(null);
      const r = await setDeliveryZoneAction(orderId, zone, editingRemote ? typed : null);
      if (r.ok) {
        toast.success("Delivery zone saved");
        setOverride(false);
        router.refresh();
      } else setError(r.error);
    });

  const context = (
    <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-500">
      <span className="inline-flex items-center gap-1.5">
        <MapPin className="size-4 text-brand-600" />
        {[city, postalCode].filter(Boolean).join(" · ") || "No delivery city on file"}
      </span>
      {distanceM != null ? (
        <span className="inline-flex items-center gap-1.5">
          <Ruler className="size-4 text-brand-600" /> {formatDistance(distanceM)} driving
        </span>
      ) : null}
    </div>
  );

  if (locked) {
    return (
      <div className="space-y-3">
        <Alert tone="info">
          <span className="inline-flex items-center gap-2">
            <Lock className="size-4" />
            The driver has collected this order, so its zone and price are final.
          </span>
        </Alert>
        <Settled zone={current.zone} fee={current.fee} />
        {context}
      </div>
    );
  }

  // Settled: a fixed-price zone resolved from the pharmacy's own configuration.
  if (!editing) {
    return (
      <div className="space-y-3">
        <Settled zone={current.zone} fee={current.fee} source={current.source} />
        {context}
        <Button variant="ghost" size="sm" onClick={() => setOverride(true)}>
          <Pencil /> Change zone
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FormError message={error} title="Delivery zone not saved" />

      {needsPrice ? (
        <Alert tone="warning">
          This postal code is not tagged for this pharmacy, so it is priced per kilometre. Confirm a price within the
          range the pharmacy was quoted — or tag the postal code, if it belongs in a zone.
        </Alert>
      ) : unresolved ? (
        <Alert tone="warning">Could not be priced automatically — there is no route to measure. Choose a zone and a price.</Alert>
      ) : null}

      {context}

      {(override || unresolved) ? (
        <div role="radiogroup" aria-label="Delivery zone" className="grid gap-2 sm:grid-cols-2">
          {DELIVERY_ZONES.map((option) => {
            const active = zone === option.id;
            const remote = option.id === REMOTE_ZONE;
            const price = remote ? null : pricing[option.id as FixedZone]?.price ?? null;
            const isDefault = remote ? false : pricing[option.id as FixedZone]?.source === "default";
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setZone(option.id)}
                className={cn(
                  "flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-soft focus-ring",
                  active ? "border-brand-600 bg-brand-50" : "border-ink-200 bg-white hover:border-brand-300",
                )}
              >
                <span className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2", active ? "border-brand-600 bg-brand-600 text-white" : "border-ink-300")}>
                  {active ? <Check className="size-3" strokeWidth={3} /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className={cn("font-bold", active ? "text-brand-800" : "text-ink-950")}>{option.label}</span>
                    {price != null ? (
                      <Badge tone={isDefault ? "neutral" : "brand"}>{formatCurrency(price)}{isDefault ? " default" : ""}</Badge>
                    ) : (
                      <Badge tone="accent">Per kilometre</Badge>
                    )}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-500">{option.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {editingRemote ? (
        <Field
          label="Price for this delivery"
          htmlFor="delivery-price"
          error={outOfRange ? `Must be between ${formatCurrency(current.quoteMin ?? 0)} and ${formatCurrency(current.quoteMax ?? 0)}` : null}
          hint={
            current.quoteMin != null && current.quoteMax != null
              ? `The pharmacy was quoted ${formatCurrency(current.quoteMin)} – ${formatCurrency(current.quoteMax)}. Charging more than the top of that range needs a new quote.`
              : "No quote was calculated for this order, so set the price by hand."
          }
        >
          <div className="relative max-w-[12rem]">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ink-500">$</span>
            <Input
              id="delivery-price"
              type="number"
              min={current.quoteMin ?? 0}
              max={current.quoteMax ?? undefined}
              step="0.01"
              className="pl-7"
              invalid={outOfRange}
              value={remotePrice}
              onChange={(e) => setRemotePrice(e.target.value)}
            />
          </div>
        </Field>
      ) : zone ? (
        <p className="text-sm text-ink-600">
          Charged at the pharmacy&apos;s {DELIVERY_ZONES.find((z) => z.id === zone)?.label} price of{" "}
          <span className="font-semibold text-ink-950">{formatCurrency(pricing[zone as FixedZone]?.price ?? 0)}</span>.
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button
          onClick={save}
          loading={pending}
          loadingText="Saving…"
          disabled={!zone || outOfRange || (editingRemote && !(typed >= 0 && remotePrice.trim() !== ""))}
        >
          {editingRemote ? "Confirm price" : "Save zone"}
        </Button>
        {override ? (
          <Button variant="ghost" onClick={() => { setOverride(false); setZone(current.zone); }} disabled={pending}>
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/** A zone that needed nothing from an admin. */
function Settled({ zone, fee, source }: { zone: DeliveryZone | null; fee: number | null; source?: DeliveryPriceSource | null }) {
  return (
    <div>
      <p className="flex flex-wrap items-baseline gap-2">
        <span className="text-2xl font-extrabold tracking-tight text-ink-950">{fee != null ? formatCurrency(fee) : "—"}</span>
        <span className="font-semibold text-ink-700">{DELIVERY_ZONES.find((z) => z.id === zone)?.label ?? "Not set"}</span>
      </p>
      <p className="mt-0.5 text-sm text-ink-500">
        {source === "tagged"
          ? "Priced automatically — this postal code is tagged to a zone for this pharmacy."
          : "Priced for this order."}
      </p>
    </div>
  );
}
