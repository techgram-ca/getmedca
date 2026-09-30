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
 * Nothing here is normally asked. Every zone settles when the order arrives —
 * a tagged postal code at its zone's price, anything else at the distance
 * times the pharmacy's per-km rate — so the price is shown, not requested.
 *
 * A control appears only for an order that arrived with no price at all: one
 * whose address never produced a route, or one created before Zone 5 priced
 * itself. Changing a settled zone is possible but deliberate.
 */
export function DeliveryZonePicker({ orderId, current, pricing, distanceM, city, postalCode, locked }: Props) {
  const router = useRouter();
  const isRemote = current.zone === REMOTE_ZONE;
  const unresolved = current.zone == null;
  const needsPrice = current.fee == null;

  const [override, setOverride] = useState(false);
  const [zone, setZone] = useState<DeliveryZone | null>(current.zone);
  // Blank unless the order already carries a price. Leaving it empty on a Zone 5
  // order re-prices from the distance rather than charging nothing.
  const [remotePrice, setRemotePrice] = useState(current.fee != null && isRemote ? String(current.fee) : "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const editing = override || unresolved || needsPrice;
  const editingRemote = zone === REMOTE_ZONE;
  const typed = Number(remotePrice);
  // Blank means "work it out from the distance", so only a typed value is checked.
  const badPrice = editingRemote && remotePrice.trim() !== "" && (!Number.isFinite(typed) || typed < 0);

  const save = () =>
    start(async () => {
      if (!zone) return;
      setError(null);
      const r = await setDeliveryZoneAction(orderId, zone, editingRemote && remotePrice.trim() !== "" ? typed : null);
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
          optional
          error={badPrice ? "Enter an amount of zero or more" : null}
          hint={
            distanceM != null
              ? `Leave this empty to charge the measured ${formatDistance(distanceM)} at the pharmacy's per-km rate. Fill it in only to override that.`
              : "This delivery has no measured distance, so it cannot price itself — set the amount here."
          }
        >
          <div className="relative max-w-[12rem]">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ink-500">$</span>
            <Input
              id="delivery-price"
              type="number"
              min={0}
              step="0.01"
              className="pl-7"
              invalid={badPrice}
              placeholder={distanceM != null ? "From distance" : ""}
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
          disabled={!zone || badPrice}
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
