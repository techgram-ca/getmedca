"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, Check, Plus } from "lucide-react";
import {
  FIXED_ZONES,
  validateZoneAreas,
  zoneLabel,
  zoneShortLabel,
  type FixedZone,
  type PostalAreaCity,
  type ZoneTextInput,
} from "@getmed/core/pricing";
import { formatCurrency } from "@getmed/core/format";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  FormError,
  Input,
  Select,
  Textarea,
  cn,
  toast,
} from "@getmed/ui";
import { savePharmacyPricingAction } from "@/lib/actions/pricing";

type ConfigDraft = { remotePerKm: string };

export type PricingFormValues = {
  prices: Record<FixedZone, string>;
  config: ConfigDraft;
  areas: ZoneTextInput;
};

export function PharmacyPricingForm({
  pharmacyId,
  pharmacyName,
  cities,
  initial,
  platform,
}: {
  pharmacyId: string;
  pharmacyName: string;
  cities: PostalAreaCity[];
  initial: PricingFormValues;
  platform: { prices: Record<FixedZone, number>; perKm: number };
}) {
  const router = useRouter();
  const [prices, setPrices] = useState(initial.prices);
  const [config, setConfig] = useState(initial.config);
  const [areas, setAreas] = useState(initial.areas);
  const [addCity, setAddCity] = useState("");
  const [addZone, setAddZone] = useState<FixedZone>("zone1");
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const knownFsas = useMemo(() => new Set(cities.flatMap((c) => c.fsas)), [cities]);
  const check = useMemo(() => validateZoneAreas(areas, knownFsas), [areas, knownFsas]);

  /**
   * Appends a city's postal areas to a zone, skipping any already assigned
   * elsewhere. Appending rather than replacing is what lets a zone be built
   * from several cities, and lets one city be split across zones.
   */
  const applyCity = () => {
    const city = cities.find((c) => c.city === addCity);
    if (!city) return;
    const taken = new Map(Object.entries(check.assignments));
    const already = new Set((check.perZone[addZone].valid ?? []).concat(check.perZone[addZone].duplicated ?? []));
    const skipped: string[] = [];
    const adding: string[] = [];
    for (const fsa of city.fsas) {
      if (already.has(fsa)) continue;
      const owner = taken.get(fsa);
      if (owner && owner !== addZone) {
        skipped.push(`${fsa} (${zoneShortLabel(owner)})`);
        continue;
      }
      adding.push(fsa);
    }
    if (adding.length === 0) {
      setNote(`Every postal area in ${city.city} is already assigned.`);
      return;
    }
    setAreas((a) => ({ ...a, [addZone]: [a[addZone].trim(), adding.join(", ")].filter(Boolean).join(", ") }));
    setNote(
      `Added ${adding.length} from ${city.city} to ${zoneShortLabel(addZone)}` +
        (skipped.length ? ` · skipped ${skipped.length} already in another zone: ${skipped.join(", ")}` : ""),
    );
  };

  const clearZone = (zone: FixedZone) => setAreas((a) => ({ ...a, [zone]: "" }));

  const save = () =>
    start(async () => {
      setError(null);
      const r = await savePharmacyPricingAction({
        pharmacyId,
        ...prices,
        config,
        areas,
      });
      if (r.ok) {
        toast.success(`Pricing saved for ${pharmacyName}`);
        router.refresh();
      } else setError(r.error);
    });

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <FormError message={error} title="Pricing not saved" />

      <Card>
        <CardHeader>
          <CardTitle>Zone prices</CardTitle>
          <CardDescription>What this pharmacy is charged per delivered order. Blank charges the platform default.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-4">
          {FIXED_ZONES.map((zone) => (
            <Field key={zone} label={zoneLabel(zone)} htmlFor={`price-${zone}`} hint={`Default ${formatCurrency(platform.prices[zone])}`} optional>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ink-500">$</span>
                <Input
                  id={`price-${zone}`}
                  type="number"
                  min={0}
                  step="0.01"
                  className="pl-7"
                  placeholder={String(platform.prices[zone])}
                  value={prices[zone]}
                  onChange={(e) => setPrices((v) => ({ ...v, [zone]: e.target.value }))}
                />
              </div>
            </Field>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Zone 5 rate</CardTitle>
          <CardDescription>
            Charged per kilometre on every delivery whose postal code is not tagged below. Blank uses the platform rate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Field label="Rate" htmlFor="per-km" hint={`Default ${formatCurrency(platform.perKm)} per km`} optional className="max-w-[12rem]">
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ink-500">$</span>
              <Input
                id="per-km"
                type="number"
                min={0}
                step="0.01"
                className="pl-7 pr-12"
                placeholder={String(platform.perKm)}
                value={config.remotePerKm}
                onChange={(e) => setConfig((c) => ({ ...c, remotePerKm: e.target.value }))}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-500">/km</span>
            </div>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delivery cities</CardTitle>
          <CardDescription>
            A tagged postal code uses its zone&apos;s price, whatever the distance. Anything untagged falls to Zone 5
            and waits for an admin, so tag every city this pharmacy delivers to. Pick a city to fill a zone, then move
            or delete individual codes — one city can be split across zones.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3 rounded-xl border border-ink-200 bg-ink-50 p-4">
            <Field label="City" htmlFor="add-city" className="min-w-52 flex-1">
              <Select id="add-city" value={addCity} onChange={(e) => setAddCity(e.target.value)}>
                <option value="">Choose a city…</option>
                {cities.map((c) => (
                  <option key={c.city} value={c.city}>
                    {c.city} ({c.fsas.length})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Add to" htmlFor="add-zone" className="min-w-40">
              <Select id="add-zone" value={addZone} onChange={(e) => setAddZone(e.target.value as FixedZone)}>
                {FIXED_ZONES.map((z) => (
                  <option key={z} value={z}>
                    {zoneLabel(z)}
                  </option>
                ))}
              </Select>
            </Field>
            <Button type="button" variant="outline" onClick={applyCity} disabled={!addCity}>
              <Plus /> Add postal areas
            </Button>
          </div>

          {note ? <p className="text-sm text-ink-600">{note}</p> : null}

          {check.duplicates.length ? (
            <Alert tone="danger" title="A postal code can only be in one zone">
              {check.duplicates.map((d) => (
                <span key={d.fsa} className="block">
                  <span className="font-mono font-semibold">{d.fsa}</span> is in {d.zones.map(zoneShortLabel).join(" and ")}.
                </span>
              ))}
            </Alert>
          ) : null}
          {check.unknown.length ? (
            <Alert tone="warning" title="Not on file">
              <span className="font-mono">{check.unknown.join(", ")}</span> — these postal areas are not in the reference
              list, so they cannot be tagged. Remove them, or add them to the reference list first.
            </Alert>
          ) : null}
          {check.malformed.length ? (
            <Alert tone="warning" title="Not a postal area">
              <span className="font-mono">{check.malformed.join(", ")}</span> — a postal area is three characters, like M5V.
            </Alert>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            {FIXED_ZONES.map((zone) => {
              const z = check.perZone[zone];
              const bad = z.duplicated.length + z.unknown.length + z.malformed.length;
              return (
                <Field
                  key={zone}
                  label={zoneLabel(zone)}
                  htmlFor={`areas-${zone}`}
                  optional
                  hint={
                    <span className="flex flex-wrap items-center gap-x-2">
                      <span className={cn(z.valid.length ? "font-semibold text-ink-700" : "")}>{z.valid.length} postal areas</span>
                      {bad ? (
                        <span className="inline-flex items-center gap-1 text-danger-500">
                          <AlertTriangle className="size-3" /> {bad} to fix
                        </span>
                      ) : null}
                      {areas[zone].trim() ? (
                        <button type="button" onClick={() => clearZone(zone)} className="text-xs text-ink-500 underline hover:text-danger-500">
                          Clear
                        </button>
                      ) : null}
                    </span>
                  }
                >
                  <Textarea
                    id={`areas-${zone}`}
                    rows={5}
                    spellCheck={false}
                    className="font-mono text-sm"
                    placeholder="M5V, M5A, M4B…"
                    value={areas[zone]}
                    onChange={(e) => setAreas((a) => ({ ...a, [zone]: e.target.value }))}
                  />
                </Field>
              );
            })}
          </div>

          <p className="text-sm text-ink-500">
            <span className="font-semibold text-ink-950">{check.total}</span> postal areas tagged in total.
            {check.total === 0 ? " This pharmacy cannot be approved until at least one is." : ""}
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" loading={pending} loadingText="Saving…" disabled={!check.ok}>
          <Check /> Save pricing
        </Button>
        {!check.ok ? <span className="text-sm text-danger-500">Fix the highlighted postal areas first</span> : null}
      </div>
    </form>
  );
}
