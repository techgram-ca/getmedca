"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PRICED_DELIVERY_TYPES, deliveryTypeLabel, type PricedDeliveryType } from "@getmed/core/pricing";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Field, FormError, Input, toast } from "@getmed/ui";
import { savePricingDefaults } from "@/lib/actions/pricing";

export function PricingDefaultsForm({ defaults, failedDeliveryPercent }: { defaults: Record<PricedDeliveryType, number>; failedDeliveryPercent: number }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<PricedDeliveryType, string>>({
    local: String(defaults.local),
    gta: String(defaults.gta),
    extended: String(defaults.extended),
  });
  const [failedPercent, setFailedPercent] = useState(String(failedDeliveryPercent));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Default prices</CardTitle>
        <CardDescription>Applied to every pharmacy that has no price of its own.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            start(async () => {
              const r = await savePricingDefaults({
                local: values.local,
                gta: values.gta,
                extended: values.extended,
                failedDeliveryPercent: failedPercent,
              });
              if (r.ok) {
                toast.success("Default prices saved");
                router.refresh();
              } else setError(r.error);
            });
          }}
        >
          <FormError message={error} title="Prices not saved" />
          <div className="grid gap-4 sm:grid-cols-3">
            {PRICED_DELIVERY_TYPES.map((type) => (
              <Field key={type} label={deliveryTypeLabel(type)} htmlFor={`default-${type}`}>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ink-500">$</span>
                  <Input
                    id={`default-${type}`}
                    type="number"
                    min={0}
                    step="0.01"
                    className="pl-7"
                    value={values[type]}
                    onChange={(e) => setValues((v) => ({ ...v, [type]: e.target.value }))}
                  />
                </div>
              </Field>
            ))}
          </div>
          <div className="border-t border-ink-200 pt-4">
            <Field
              label="Failed delivery charge"
              htmlFor="failed-percent"
              hint="Share of the quoted fee billed when a driver marks a delivery failed — the trip was still made. Set 0 to make failed attempts free."
              className="max-w-xs"
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
