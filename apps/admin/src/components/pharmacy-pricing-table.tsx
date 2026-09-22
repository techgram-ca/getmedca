"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { PRICED_DELIVERY_TYPES, deliveryTypeLabel, type PharmacyPricing, type PricedDeliveryType } from "@getmed/core/pricing";
import { formatCurrency } from "@getmed/core/format";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  EmptyState,
  Field,
  FormError,
  Input,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  toast,
} from "@getmed/ui";
import { savePharmacyPricingAction } from "@/lib/actions/pricing";

type Pharmacy = { id: string; name: string; city: string | null; status: string };
type Draft = { pharmacyId: string; name: string } & Record<PricedDeliveryType, string>;

export function PharmacyPricingTable({
  pharmacies,
  pricing,
  defaults,
}: {
  pharmacies: Pharmacy[];
  pricing: Record<string, PharmacyPricing>;
  defaults: Record<PricedDeliveryType, number>;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const openEditor = (p: Pharmacy) => {
    const current = pricing[p.id];
    setError(null);
    setDraft({
      pharmacyId: p.id,
      name: p.name,
      // Blank means "use the default", so only overrides are pre-filled.
      local: current?.local.source === "pharmacy" ? String(current.local.price) : "",
      gta: current?.gta.source === "pharmacy" ? String(current.gta.price) : "",
      extended: current?.extended.source === "pharmacy" ? String(current.extended.price) : "",
    });
  };

  const save = () =>
    start(async () => {
      if (!draft) return;
      const r = await savePharmacyPricingAction({
        pharmacyId: draft.pharmacyId,
        local: draft.local.trim(),
        gta: draft.gta.trim(),
        extended: draft.extended.trim(),
      });
      if (r.ok) {
        toast.success(`Prices saved for ${draft.name}`);
        setDraft(null);
        router.refresh();
      } else setError(r.error);
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prices by pharmacy</CardTitle>
        <CardDescription>Leave a field blank in the editor to charge that pharmacy the default.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {pharmacies.length === 0 ? (
          <EmptyState title="No pharmacies yet" description="Prices can be set once a pharmacy has applied." className="m-5" />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Pharmacy</TH>
                {PRICED_DELIVERY_TYPES.map((t) => <TH key={t}>{deliveryTypeLabel(t)}</TH>)}
                <TH />
              </TR>
            </THead>
            <TBody>
              {pharmacies.map((p) => {
                const prices = pricing[p.id];
                return (
                  <TR key={p.id}>
                    <TD>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-ink-500">{[p.city, p.status].filter(Boolean).join(" · ")}</div>
                    </TD>
                    {PRICED_DELIVERY_TYPES.map((t) => {
                      const cell = prices?.[t];
                      return (
                        <TD key={t}>
                          <span className="font-semibold tabular-nums">{formatCurrency(cell?.price ?? defaults[t])}</span>
                          {cell?.source === "pharmacy" ? (
                            <Badge tone="brand" className="ml-2">Custom</Badge>
                          ) : (
                            <span className="ml-2 text-xs text-ink-400">default</span>
                          )}
                        </TD>
                      );
                    })}
                    <TD className="text-right">
                      <Button size="sm" variant="outline" onClick={() => openEditor(p)}><Pencil /> Edit</Button>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={draft !== null} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent title={draft ? `Prices for ${draft.name}` : "Prices"} description="Leave a field blank to charge the default for that delivery type.">
          {draft ? (
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
              <FormError message={error} title="Prices not saved" />
              {PRICED_DELIVERY_TYPES.map((t) => (
                <Field
                  key={t}
                  label={deliveryTypeLabel(t)}
                  htmlFor={`price-${t}`}
                  hint={`Default is ${formatCurrency(defaults[t])}`}
                  optional
                >
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ink-500">$</span>
                    <Input
                      id={`price-${t}`}
                      type="number"
                      min={0}
                      step="0.01"
                      className="pl-7"
                      placeholder={String(defaults[t])}
                      value={draft[t]}
                      onChange={(e) => setDraft({ ...draft, [t]: e.target.value })}
                    />
                  </div>
                </Field>
              ))}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
                <Button type="submit" loading={pending} loadingText="Saving…">Save prices</Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
