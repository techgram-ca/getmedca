"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { FIXED_ZONES, zoneLabel, type DeliveryConfigInput, type FixedZone, type PharmacyPricing } from "@getmed/core/pricing";
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
type ConfigDraft = { remotePerKm: string; zone1MaxKm: string; zone2MaxKm: string; zone3MaxKm: string; zone4MaxKm: string };
type Draft = { pharmacyId: string; name: string; config: ConfigDraft } & Record<FixedZone, string>;

const BLANK_CONFIG: ConfigDraft = { remotePerKm: "", zone1MaxKm: "", zone2MaxKm: "", zone3MaxKm: "", zone4MaxKm: "" };
const num = (v: number | null | undefined) => (v == null ? "" : String(v));

export function PharmacyPricingTable({
  pharmacies,
  pricing,
  defaults,
  configs,
  platformBands,
  platformPerKm,
}: {
  pharmacies: Pharmacy[];
  pricing: Record<string, PharmacyPricing>;
  defaults: Record<FixedZone, number>;
  configs: Record<string, DeliveryConfigInput>;
  platformBands: Record<FixedZone, number>;
  platformPerKm: number;
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
      ...(Object.fromEntries(
        FIXED_ZONES.map((z) => [z, current?.[z].source === "pharmacy" ? String(current[z].price) : ""]),
      ) as Record<FixedZone, string>),
      config: {
        remotePerKm: num(configs[p.id]?.remotePerKm),
        zone1MaxKm: num(configs[p.id]?.zone1MaxKm),
        zone2MaxKm: num(configs[p.id]?.zone2MaxKm),
        zone3MaxKm: num(configs[p.id]?.zone3MaxKm),
        zone4MaxKm: num(configs[p.id]?.zone4MaxKm),
      },
    });
  };

  const save = () =>
    start(async () => {
      if (!draft) return;
      const r = await savePharmacyPricingAction({
        pharmacyId: draft.pharmacyId,
        ...Object.fromEntries(FIXED_ZONES.map((z) => [z, draft[z].trim()])),
        config: {
          remotePerKm: draft.config.remotePerKm.trim(),
          zone1MaxKm: draft.config.zone1MaxKm.trim(),
          zone2MaxKm: draft.config.zone2MaxKm.trim(),
          zone3MaxKm: draft.config.zone3MaxKm.trim(),
          zone4MaxKm: draft.config.zone4MaxKm.trim(),
        },
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
                {FIXED_ZONES.map((t) => <TH key={t}>{zoneLabel(t)}</TH>)}
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
                    {FIXED_ZONES.map((t) => {
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
              {FIXED_ZONES.map((t) => (
                <Field
                  key={t}
                  label={zoneLabel(t)}
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
              <div className="space-y-4 border-t border-ink-200 pt-4">
                <p className="text-sm font-semibold text-ink-900">Zone 5 and distance bands</p>
                <p className="text-sm text-ink-500">
                  Blank uses the platform setting. Bands only apply to postal codes this pharmacy has not tagged.
                </p>
                <Field
                  label="Zone 5 rate"
                  htmlFor="config-per-km"
                  hint={`Platform default is ${formatCurrency(platformPerKm)} per km`}
                  optional
                >
                  <div className="relative max-w-[10rem]">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ink-500">$</span>
                    <Input
                      id="config-per-km"
                      type="number"
                      min={0}
                      step="0.01"
                      className="pl-7 pr-12"
                      placeholder={String(platformPerKm)}
                      value={draft.config.remotePerKm}
                      onChange={(e) => setDraft({ ...draft, config: { ...draft.config, remotePerKm: e.target.value } })}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-500">/km</span>
                  </div>
                </Field>
                <div className="grid gap-3 sm:grid-cols-4">
                  {FIXED_ZONES.map((zone) => {
                    const key = `${zone}MaxKm` as keyof ConfigDraft;
                    return (
                      <Field key={zone} label={`${zoneLabel(zone)} up to`} htmlFor={`config-${zone}`} optional>
                        <div className="relative">
                          <Input
                            id={`config-${zone}`}
                            type="number"
                            min={0}
                            step="0.5"
                            className="pr-11"
                            placeholder={String(platformBands[zone])}
                            value={draft.config[key]}
                            onChange={(e) => setDraft({ ...draft, config: { ...draft.config, [key]: e.target.value } })}
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-500">km</span>
                        </div>
                      </Field>
                    );
                  })}
                </div>
              </div>

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
