"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FIXED_ZONES, zoneLabel, type FixedZone } from "@getmed/core/pricing";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Field, FormError, Input, toast } from "@getmed/ui";
import { savePricingDefaults } from "@/lib/actions/pricing";

export type PricingDefaults = {
  prices: Record<FixedZone, number>;
  remotePerKm: number;
  failedDeliveryPercent: number;
};

/**
 * Platform-wide pricing. Every pharmacy inherits these until an admin gives it
 * its own numbers on the table below.
 */
export function PricingDefaultsForm({ defaults }: { defaults: PricingDefaults }) {
  const router = useRouter();
  const [prices, setPrices] = useState<Record<FixedZone, string>>(
    () => Object.fromEntries(FIXED_ZONES.map((z) => [z, String(defaults.prices[z])])) as Record<FixedZone, string>,
  );
  const [perKm, setPerKm] = useState(String(defaults.remotePerKm));
  const [failedPercent, setFailedPercent] = useState(String(defaults.failedDeliveryPercent));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await savePricingDefaults({
        ...Object.fromEntries(FIXED_ZONES.map((z) => [z, prices[z]])),
        remotePerKm: perKm,
        failedDeliveryPercent: failedPercent,
      });
      if (r.ok) {
        toast.success("Default pricing saved");
        router.refresh();
      } else setError(r.error);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform defaults</CardTitle>
        <CardDescription>Used by every pharmacy that has no numbers of its own.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={submit}>
          <FormError message={error} title="Pricing not saved" />

          <div>
            <p className="text-sm font-semibold text-ink-900">Zone prices</p>
            <p className="mt-1 text-sm text-ink-500">What a pharmacy is charged per delivered order in each zone.</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-4">
              {FIXED_ZONES.map((zone) => (
                <Field key={zone} label={zoneLabel(zone)} htmlFor={`price-${zone}`}>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ink-500">$</span>
                    <Input
                      id={`price-${zone}`}
                      type="number"
                      min={0}
                      step="0.01"
                      className="pl-7"
                      value={prices[zone]}
                      onChange={(e) => setPrices((v) => ({ ...v, [zone]: e.target.value }))}
                    />
                  </div>
                </Field>
              ))}
            </div>
          </div>

          <div className="grid gap-4 border-t border-ink-200 pt-5 sm:grid-cols-2">
            <Field
              label="Zone 5 rate"
              htmlFor="per-km"
              hint="Charged per kilometre of driving distance. Applies to every delivery whose postal code a pharmacy has not tagged; the admin confirms the final price on each one."
            >
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ink-500">$</span>
                <Input id="per-km" type="number" min={0} step="0.01" className="pl-7 pr-14" value={perKm} onChange={(e) => setPerKm(e.target.value)} />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-ink-500">/ km</span>
              </div>
            </Field>
            <Field
              label="Failed delivery charge"
              htmlFor="failed-percent"
              hint="Share of the quoted fee billed when a driver marks a delivery failed — the trip was still made. Set 0 to make failed attempts free."
            >
              <div className="relative">
                <Input
                  id="failed-percent"
                  type="number"
                  min={0}
                  max={100}
                  step="1"
                  className="pr-9"
                  value={failedPercent}
                  onChange={(e) => setFailedPercent(e.target.value)}
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-ink-500">%</span>
              </div>
            </Field>
          </div>

          <Button type="submit" loading={pending} loadingText="Saving…">Save defaults</Button>
        </form>
      </CardContent>
    </Card>
  );
}
