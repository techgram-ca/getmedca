"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Check, MapPin, X } from "lucide-react";
import { FIXED_ZONES, zoneShortLabel, type FixedZone, type PostalAreaCity } from "@getmed/core/pricing";
import { Alert, Badge, Button, FormError, Input, cn, toast } from "@getmed/ui";
import { saveZoneAreasAction } from "@/lib/actions/pricing";

type Assignments = Record<string, FixedZone | null>;

/**
 * Tags this pharmacy's postal areas to zones. Matching happens on the FSA, not
 * the city name — the city is only how an admin finds the right postal codes.
 *
 * A tagged postal code always wins over the distance bands, which is the point:
 * it is the price the pharmacy was promised for that city however far it is.
 */
export function ZoneAreasEditor({
  pharmacyId,
  cities,
  initial,
}: {
  pharmacyId: string;
  cities: PostalAreaCity[];
  initial: Assignments;
}) {
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignments>(initial);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const tagged = useMemo(() => Object.values(assignments).filter(Boolean).length, [assignments]);
  const dirty = useMemo(() => {
    const keys = new Set([...Object.keys(assignments), ...Object.keys(initial)]);
    return [...keys].some((k) => (assignments[k] ?? null) !== (initial[k] ?? null));
  }, [assignments, initial]);

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return cities;
    return cities
      .map((c) => ({
        city: c.city,
        fsas: c.city.toLowerCase().includes(q) ? c.fsas : c.fsas.filter((f) => f.toLowerCase().includes(q)),
      }))
      .filter((c) => c.fsas.length > 0);
  }, [cities, filter]);

  const setCity = (fsas: string[], zone: FixedZone | null) =>
    setAssignments((a) => ({ ...a, ...Object.fromEntries(fsas.map((f) => [f, zone])) }));

  const save = () =>
    start(async () => {
      setError(null);
      const r = await saveZoneAreasAction(pharmacyId, assignments);
      if (r.ok) {
        toast.success(`${tagged} postal ${tagged === 1 ? "area" : "areas"} saved`);
        router.refresh();
      } else setError(r.error);
    });

  return (
    <div className="space-y-4">
      <FormError message={error} title="Postal areas not saved" />

      {tagged === 0 ? (
        <Alert tone="warning">
          No postal areas tagged yet. Until at least one is, every delivery is priced by driving distance, and this
          pharmacy cannot be approved.
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Find a city or postal code"
          className="max-w-xs"
          aria-label="Filter cities and postal codes"
        />
        <span className="text-sm text-ink-500">
          <span className="font-semibold text-ink-950">{tagged}</span> tagged
        </span>
      </div>

      <div className="max-h-[32rem] divide-y divide-ink-200 overflow-y-auto rounded-xl border border-ink-200">
        {visible.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-ink-500">Nothing matches “{filter}”.</p>
        ) : (
          visible.map((city) => {
            const zones = new Set(city.fsas.map((f) => assignments[f] ?? null));
            const uniform = zones.size === 1 ? [...zones][0] : null;
            const anyTagged = city.fsas.some((f) => assignments[f]);
            return (
              <div key={city.city} className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <MapPin className={cn("size-4", anyTagged ? "text-brand-600" : "text-ink-400")} />
                    <span className="font-semibold text-ink-950">{city.city}</span>
                    <span className="text-xs text-ink-400">{city.fsas.length} postal {city.fsas.length === 1 ? "area" : "areas"}</span>
                    {zones.size > 1 ? <Badge tone="accent">Mixed</Badge> : null}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {FIXED_ZONES.map((zone) => (
                      <button
                        key={zone}
                        type="button"
                        onClick={() => setCity(city.fsas, zone)}
                        aria-pressed={uniform === zone}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs font-semibold transition-soft focus-ring",
                          uniform === zone
                            ? "border-brand-600 bg-brand-600 text-white"
                            : "border-ink-200 bg-white text-ink-600 hover:border-brand-600 hover:text-brand-700",
                        )}
                      >
                        {zoneShortLabel(zone)}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setCity(city.fsas, null)}
                      disabled={!anyTagged}
                      className="rounded-full border border-ink-200 bg-white px-2.5 py-1 text-xs font-semibold text-ink-500 transition-soft hover:border-danger-500 hover:text-danger-500 focus-ring disabled:opacity-40"
                    >
                      <X className="inline size-3" /> Clear
                    </button>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {city.fsas.map((fsa) => {
                    const zone = assignments[fsa] ?? null;
                    return (
                      <button
                        key={fsa}
                        type="button"
                        // Cycles through the zones, then back to untagged.
                        onClick={() => {
                          const next = zone == null ? FIXED_ZONES[0]! : FIXED_ZONES[FIXED_ZONES.indexOf(zone) + 1] ?? null;
                          setAssignments((a) => ({ ...a, [fsa]: next }));
                        }}
                        title={zone ? `${fsa} — ${zoneShortLabel(zone)}` : `${fsa} — not tagged`}
                        className={cn(
                          "rounded-md border px-2 py-1 font-mono text-xs transition-soft focus-ring",
                          zone
                            ? "border-brand-600 bg-brand-50 text-brand-800"
                            : "border-ink-200 bg-white text-ink-400 hover:border-ink-300",
                        )}
                      >
                        {fsa}
                        {zone ? <span className="ml-1 font-sans font-bold">{zone.replace("zone", "Z")}</span> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={save} loading={pending} loadingText="Saving…" disabled={!dirty}>
          <Check /> Save postal areas
        </Button>
        {dirty ? <span className="text-sm text-ink-500">Unsaved changes</span> : null}
      </div>
    </div>
  );
}
