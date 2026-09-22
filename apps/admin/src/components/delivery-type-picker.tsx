"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Lock } from "lucide-react";
import { DELIVERY_TYPES, type PharmacyPricing, type PricedDeliveryType } from "@getmed/core/pricing";
import { formatCurrency } from "@getmed/core/format";
import type { DeliveryType } from "@getmed/db/types";
import { Alert, Badge, Button, Field, FormError, Input, cn, toast } from "@getmed/ui";
import { setDeliveryTypeAction } from "@/lib/actions/orders";

type Props = {
  orderId: string;
  current: { type: DeliveryType | null; fee: number | null };
  pricing: PharmacyPricing;
  /** True once the driver has collected the order, after which the price is final. */
  locked: boolean;
};

export function DeliveryTypePicker({ orderId, current, pricing, locked }: Props) {
  const router = useRouter();
  const [type, setType] = useState<DeliveryType | null>(current.type);
  const [customPrice, setCustomPrice] = useState(current.type === "custom" && current.fee != null ? String(current.fee) : "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const configuredPrice = type && type !== "custom" ? pricing[type as PricedDeliveryType]?.price ?? null : null;
  const dirty = type !== current.type || (type === "custom" && Number(customPrice) !== current.fee);

  if (locked) {
    return (
      <Alert tone="info">
        <span className="inline-flex items-center gap-2">
          <Lock className="size-4" />
          The driver has collected this order, so its delivery type and price are final.
        </span>
      </Alert>
    );
  }

  const save = () =>
    start(async () => {
      if (!type) return;
      setError(null);
      const r = await setDeliveryTypeAction(orderId, type, type === "custom" ? Number(customPrice) : null);
      if (r.ok) {
        toast.success("Delivery type saved");
        router.refresh();
      } else setError(r.error);
    });

  return (
    <div className="space-y-4">
      <FormError message={error} title="Delivery type not saved" />

      <div role="radiogroup" aria-label="Delivery type" className="grid gap-2 sm:grid-cols-2">
        {DELIVERY_TYPES.map((option) => {
          const active = type === option.id;
          const price = option.id === "custom" ? null : pricing[option.id as PricedDeliveryType]?.price ?? null;
          const isDefault = option.id === "custom" ? false : pricing[option.id as PricedDeliveryType]?.source === "default";
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setType(option.id)}
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
                    <Badge tone="accent">Price per order</Badge>
                  )}
                </span>
                <span className="mt-0.5 block text-xs text-ink-500">{option.description}</span>
              </span>
            </button>
          );
        })}
      </div>

      {type ? (
        <Field
          label={type === "custom" ? "Price for this order" : "Price charged to the pharmacy"}
          htmlFor="delivery-price"
          hint={type === "custom" ? "Applies to this order only." : "Set on the Pricing page."}
        >
          <div className="relative max-w-[12rem]">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ink-500">$</span>
            {type === "custom" ? (
              <Input
                id="delivery-price"
                type="number"
                min={0}
                step="0.01"
                className="pl-7"
                autoFocus
                placeholder="0.00"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
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
          disabled={!type || (type === "custom" && !(Number(customPrice) >= 0 && customPrice.trim() !== "")) || !dirty}
        >
          {current.type ? "Update delivery type" : "Save delivery type"}
        </Button>
        {current.type && !dirty ? <span className="text-sm text-ink-500">Saved</span> : null}
      </div>
    </div>
  );
}
