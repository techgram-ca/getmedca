"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Lock, MapPin, Ruler } from "lucide-react";
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

const SOURCE_NOTE: Record<DeliveryPriceSource, string> = {
  tagged: "Priced automatically — this postal code is tagged to a zone for this pharmacy.",
  band: "Priced automatically — this postal code is not tagged, so the driving distance chose the zone.",
  remote: "Beyond the pharmacy's zones. Confirm a price within the range the pharmacy was quoted.",
  manual: "Could not be priced automatically. Choose a zone, or price it as remote.",
};

export function DeliveryZonePicker({ orderId, current, pricing, distanceM, city, postalCode, locked }: Props) {
  const router = useRouter();
  const [zone, setZone] = useState<DeliveryZone | null>(current.zone);
  // Pre-filled with the bottom of the quoted span, which is the per-km price
  // itself — confirming without touching it charges exactly the configured rate.
  const [remotePrice, setRemotePrice] = useState(
    current.fee != null && current.zone === REMOTE_ZONE ? String(current.fee) : current.quoteMin != null ? String(current.quoteMin) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const isRemote = zone === REMOTE_ZONE;
  const configuredPrice = zone && !isRemote ? pricing[zone as FixedZone]?.price ?? null : null;
  const typed = Number(remotePrice);
  const outOfRange =
    isRemote &&
    remotePrice.trim() !== "" &&
    ((current.quoteMin != null && typed < current.quoteMin) || (current.quoteMax != null && typed > current.quoteMax));
  const dirty = zone !== current.zone || (isRemote && typed !== current.fee);

  if (locked) {
    return (
      <Alert tone="info">
        <span className="inline-flex items-center gap-2">
          <Lock className="size-4" />
          The driver has collected this order, so its zone and price are final.
        </span>
      </Alert>
    );
  }

  const save = () =>
    start(async () => {
      if (!zone) return;
      setError(null);
      const r = await setDeliveryZoneAction(orderId, zone, isRemote ? typed : null);
      if (r.ok) {
        toast.success("Delivery zone saved");
        router.refresh();
      } else setError(r.error);
    });

  return (
    <div className="space-y-4">
      <FormError message={error} title="Delivery zone not saved" />

      {current.source ? (
        <Alert tone={current.source === "remote" || current.source === "manual" ? "warning" : "info"}>
          {SOURCE_NOTE[current.source]}
        </Alert>
      ) : null}

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

      {zone ? (
        <Field
          label={isRemote ? "Price for this delivery" : "Price charged to the pharmacy"}
          htmlFor="delivery-price"
          error={outOfRange ? `Must be between ${formatCurrency(current.quoteMin ?? 0)} and ${formatCurrency(current.quoteMax ?? 0)}` : null}
          hint={
            isRemote
              ? current.quoteMin != null && current.quoteMax != null
                ? `The pharmacy was quoted ${formatCurrency(current.quoteMin)} – ${formatCurrency(current.quoteMax)}. Charging more than the top of that range needs a new quote.`
                : "No quote was calculated for this order, so set the price by hand."
              : "Set on the Pricing page."
          }
        >
          <div className="relative max-w-[12rem]">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ink-500">$</span>
            {isRemote ? (
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
            ) : (
              <Input id="delivery-price" readOnly disabled className="pl-7" value={configuredPrice != null ? configuredPrice.toFixed(2) : ""} />
            )}
          </div>
        </Field>
      ) : null}

      <div className="flex items-center gap-3">
        <Button
          onClick={save}
          loading={pending}
          loadingText="Saving…"
          disabled={!zone || outOfRange || (isRemote && !(typed >= 0 && remotePrice.trim() !== "")) || !dirty}
        >
          {isRemote ? "Confirm price" : current.zone ? "Change zone" : "Save zone"}
        </Button>
        {current.zone && !dirty ? <span className="text-sm text-ink-500">Saved</span> : null}
      </div>
    </div>
  );
}
